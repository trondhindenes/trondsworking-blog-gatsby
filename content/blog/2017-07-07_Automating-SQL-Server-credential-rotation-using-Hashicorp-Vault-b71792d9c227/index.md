---
title: Automating SQL Server credential rotation using Hashicorp Vault
description: >-
  NOTE: Medium doesn’t like my code formatting, so please head over to the
  source blog post if you want to work thru the code examples in…
date: '2017-07-07T04:26:04.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/automating-sql-server-credential-rotation-using-hashicorp-vault-b71792d9c227
---

**NOTE: Medium doesn’t like my code formatting, so please head over to the source blog post if you want to work thru the code examples in this blog post:** [**https://t.co/KEVj4PNTM2**](https://t.co/KEVj4PNTM2)

When looking for a secret management solution last year we actually decided _not_ to go with Vault, for a couple of different reasons, the most important was that we needed something lightweight and simple to set up as we (I) had so much going on that we (I) just didn’t have the time to dig deep into Vault and all its intricasies at the time. It seems that Vault has a certain gravitational pull tho, and more and more products integrate with it — tools like [Rancher ](http://rancher.com/docs/rancher/v1.5/en/cattle/secrets/), [Concourse](https://concourse.ci/creds.html#vault) and a bunch of others simply offload the meat of their credential management story to Vault. Which means that it was about time for me to have another look at it.

As you may know, I work at a “mostly .Net” shop with tons of SQL databases across multiple environments, and as we’re slowly starting to embrace cloudy things, it’s probably a pretty bad bet to just assume that apps will authenticate to SQL server using Kerberos for all eternity. Which means that we need to come up with **some other way®** to make sure our apps can access the DBs they need, and only those.

What I like about Vault is that it takes “credentials management” one step further than many other options — instead of storing “static” credentials in a (hopefully secure) database, it will generate a time-limited credential on the fly and automatically expire it (delete it) when the TTL has passed. That’s not to say you can’t use Vault as an “old-school” password management system — it supports that too. But if you happen to use a system Vault supports for its “on-the-fly” credentials feature you can use that to get much tighter security than your “static passwords” solution will provide.

Here’s how I envision a typical workflow (mind you, this is my own rambling, not taken from Vault’s documentation):

1\. A VM is provisioned because we want to scale out/replace our API layer. Config management knows which app(s) this server will run, and requests an _AppRole_ from vault with the correct permissions.  
 2. The app starts up, and using its _AppRole_ credentials from step one, requests a credential from Vault which will give it access to Database1.  
 3. Vault checks that the VM’s AppRole (I got tired of writing in Italic) has the necessary permissions (controlled thru _Policies_) to request a db credential, which it has. Vault then talks to the SQL Server which generates a Login, which Vault forwards to the VM. 4. If using TTLs, the VM needs to “know” when the TTL for its SQL credential is about to pass, and requests another one when the first is about to expire, and step 3 happens all over.

5\. When the (first) SQL Login credential expires, vault again talks to SQL Server and asks it to remove that Login. And so it goes.

There’s a couple of points worth mentioning about this approach

*   There’s no single “I have all the access” credential that gives access to everything. Those are nasty.
*   Credential rotation is not a painful process you need to endeavor once every xx days/weeks/months, its something that happens automatically as often as you want.
*   You can set up Vault to provide you with a full audit trail of all activities including applications rotating their credentials.
*   You can isolate as tight as you want. For example, its fairly easy to configure policies so that only servers in production get to request prod DB credentials. I’m using SQL Server Logins here, but be sure to check out Vault’s support for dynamic credentials for stuff like RabbitMQ, AWS IAM users, and many others. While diving into this I setup a small lab using Docker and Microsoft’s SQL Server for Linux image, so that I could test things without the hassle of standing up a full SQL server instance. The rest of this post is a walkthru of that lab, which you can find the code for here:

[https://github.com/trondhindenes/vault-mssql-lab](https://github.com/trondhindenes/vault-mssql-lab)

I’m assuming you have some way of running Docker on your computer. I’m using Docker machine with Virtualbox on my Windows 10 laptop. Before firing up the thing, make sure you adjust the mapping for the vault container so that it lines up with your local path:

\- /c/Users/trond/Documents/projects/vault-dev:/vaultdev

In order to get up and running, do the following:

#Start the SQL Server container   
docker-compose.exe up -d sqlserver   
#Create a DB called "testdb" docker exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P MyPassword123 -Q "CREATE database testdb"   
#Start the vault container docker-compose.exe up -d vault #Grab the output from the vault container - you'll find the "root token" here docker logs vault

At this point, we have a running vault server, running in dev mode — which is nice for labbing but not for real production usage. To interact with the vault server I just create a second console session and use that to attach an interactive bash session with the vault container:

#enter an interactive session to the vault container   
docker exec -it vault /bin/bash   
#log in to vault using the obtained root token (replace with your own token)   
vault auth 0c7d8a21-0d41-ecf0-b779-27aa8b1d8a67

At this point, we’re ready to do stuff with Vault. We’ll create a SQL Server secrets backend, an AppRole auth backend, and the policies and things we need to get this thing working. All of this can also be found in the “do\_things.sh” script in the lab git repo, but It’s probably better to paste stuff in line by line.

First, we’ll create a “regular” admin user so that we don’t have to use the “root token” anymore. The “admins.hcl” policy enables access to everything, but you can lock this down as you move along.

#create a userpass auth backend:   
vault auth-enable userpass vault write auth/userpass/users/admin password=admin policies=admins vault policy-write admins /vaultdev/data/policies/admins.hcl   
#Switch to the regular "admin" login: vault auth -method=userpass username=admin password=admin

At this point, you’re logged in to Vault with your “admin” user. Continue setting up the thing, starting with the SQL Server integration which will allow Vault to auto-provision SQL Server Logins.

#activate the database secret backend, and #create the mssql 'connection' vault mount database vault write database/config/mssql plugin\_name=mssql-database-plugin connection\_url='sqlserver://sa:MyPassword123@sqlserver:1433' allowed\_roles="testdb\_fullaccess,testdb\_readaccess" #create the role for db read-only access vault write database/roles/testdb\_readaccess db\_name=mssql creation\_statements="USE \[master\]; CREATE LOGIN \[{{name}}\] WITH PASSWORD='{{password}}', DEFAULT\_DATABASE=\[master\], CHECK\_EXPIRATION=OFF, CHECK\_POLICY=OFF;USE \[testdb\];CREATE USER \[{{name}}\] FOR LOGIN \[{{name}}\];ALTER ROLE \[db\_datareader\] ADD MEMBER \[{{name}}\];" default\_ttl="1m" max\_ttl="5m" #create the role for db full access vault write database/roles/testdb\_fullaccess db\_name=mssql creation\_statements="USE \[master\]; CREATE LOGIN \[{{name}}\] WITH PASSWORD='{{password}}', DEFAULT\_DATABASE=\[master\], CHECK\_EXPIRATION=OFF, CHECK\_POLICY=OFF;USE \[testdb\];CREATE USER \[{{name}}\] FOR LOGIN \[{{name}}\];ALTER ROLE \[db\_owner\] ADD MEMBER \[{{name}}\];" default\_ttl="1m" max\_ttl="5m" #create a policy for db read-only access. Note that we're not creating one for full access vault policy-write testdb\_readaccess /vaultdev/data/policies/testdb\_readaccess.hcl

As you can see from the above code, the integration works by providing a connection string to the server (my “connection” is named mssql but in a real-world scenario I’d probably use the name of the server/cluster). Each “role” essentially contains the SQL script that Vault will execute against the SQL Server, after replacing the templated values for the Login name (which will be auto-generated). We’ll see this in practice in a few secs. Also note that I’ve set the default ttl to a very low value (1m). Vault will simply delete the SQL Login after the ttl has passed.

Users can request a credential by using the “database” backend created above by specifying one of the two roles we created in that backend. Have a look at the contents of the “testdb\_readaccess.hcl” policy to see an example of a policy controlling access to the backend/role.

We can now test the sql connection by requesting a few credentials:

#test the thing vault read database/creds/testdb\_readaccess vault read database/creds/testdb\_fullaccess

if you hook up a SQL Server Management studio to port 1433 of the SQL Server container (I’m using ip address 192.168.99.100 by default, but your mileage on that will probably vary) you’ll see two Logins created, and if you wait 60 secs you’ll also see that Vault removes them automatically.

Now its time to create an auth backend that our app can use:

#Enable the approle auth backend: vault auth-enable approle vault write auth/approle/role/testdb\_readaccess role\_id=test policies=testdb\_readaccess secret\_id\_ttl=0 token\_num\_uses=0 #Get a secretId - this is what your CM tool will somehow inject into your vm: vault write -f auth/approle/role/testdb\_readaccess/secret-id

I have to admit I’ve struggled a bit with Vault’s documentation. I think I would have laid out the structure of it very differently if it was a system I owned myself, so it takes some getting used to. It’s probably safe to say that the squeeze is worth the juice tho.

So, just to recap what we’ve done so far:

*   We’ve created a _secrets backend_ based on the “databases/mssql” type
*   We’ve created an _auth backend_ for regular users (where our admin user is, and one other auth backend on the AppRole type.
*   Inside the “databases” backend we’ve created 2 roles (testdb\_readaccess and testdb\_fullaccess). In Vault lingo a credential is created _against_ a role. Think of roles as containers inside a secret backend, and credentials you create get created inside that role.
*   We’ve created an _ACL Policy_ called “testdb\_readaccess”. ACL Policies are not tied to a certain auth or secrets backend, they control overall access in the Vault system. Sinve Vault is very REST-friendly with everything being a path, policies work by allowing different types of access to one or multiple paths.
*   Inside the approle auth backend, we created another role called testdb\_readaccess, attached to the policy created above. Any AppRole created against (inside) that role will get applied the policy, and thus gets access to _read_ a credential from the “testdb\_readaccess” role inside our database secrets backend.

Whew.

Before starting up our very real-life app there’s a few more things about AppRoles probably worth mentioning: The idea (in my mind at least) is that you create an AppRole role (eh) per vm or (or container) you spin up. For us it will probably be part of the provisioning/bootstrapping Ansible will do for us whenever we provision a vm in aws. The actual “credential” the vm needs to “use” an approle is the approle role ID (“test” in my example, but by default this is a guid-type string), and a secret id. Its also possibly to limit the use of the approle based on cidr. This means that if your vm will have a static ip address thru its lifecycle you can increase security by specifying that only vms with a certain ip address is allowed to use the credential, which is pretty awesome.

Okay, so lets say you inject role id and secret id as environment variables or something — now you need to decide wether to make your apps completely oblivious to Vault or if you want to write some kind of integration. The latter is generally preferred from a security standpoint, as it will allow short ttls on secrets — your app will simply refresh these itself. You could also write an “agent” which takes care of this, and makes sure a “known config” file is kept up to date with the right database credentials — in that case you’d have to make sure that your app reads the updated config file. For asp.net apps, any changes to _web.config_ triggers a recycle of the application pool running the app, so the problem shouldn’t be hard to solve there.

Just to test stuff out in a container I wrote a small python app which runs a console app in a loop, and requests a new database credential whenever its current is at 50% of its ttl (so, 30 secs in our example).

Before starting it you need to set the secrets\_id environment variable in our docker-compose.yml file for the lab based on the last output (the “secret\_id” field) from the above scripts.

Run the “app” container by issuing the following:

docker-compose up -d app

And stream its logs:

docker logs -f app

You should see something like:

number of responses from sql server: 6 number of responses from sql server: 6 number of responses from sql server: 6 getting/updating sql server credentials number of responses from sql server: 6 number of responses from sql server: 6 number of responses from sql server: 6 number of responses from sql server: 6

The python app simply requests a new sql credential from vault after 30 seconds (50% of the ttl), so if you open SQL Server Management Studio you should see the Logins get removed as time passes.

Wrapping up, there’s a couple of things to note here:

*   The AppRole uses its role-id + secret-id to get a token. This token is what it’s using to authenticate to Vault when requesting a SQL server login. This token has a 20 minute ttl, which means that the example app will stop working after 20 minutes, as I haven’t coded any token refresh logic
*   By default, an AppRole has some very strict TTLs, and re-using a secret id is not allowed. I’m not sure I quite understand how Hashicorp figures this to be used in practice, as a vm has to be able to re-request credentials after reboots and such without “help” from config management or other tools (or maybe I’m supposed to use refresh tokens for this, idk). My code simply sets very generous ttls/id reuse values. You should probably investigate this before starting to use approles, at least I will.
*   I’ve added an “env” file that will allow you to debug the python app in VSCode after replacing the “secret\_id” with your own, if you prefer that instead of using the “app” container.

In any case, this is a very simple walkthru of one of the many capabilities of Vault. Hopefully you’ll find it interesting enough to learn more about the product.

_Originally published at_ [_hindenes.com_](http://hindenes.com/trondsworking/2017/07/07/automating-sql-server-credential-rotation-using-hashicorp-vault/) _on July 7, 2017._