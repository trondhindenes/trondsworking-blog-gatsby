---
title: How we’re maintaining SQL Server Database infos in git
description: >-
  As part of our current migration from a legacy hosting provider to AWS, we’re
  moving a number of databases into AWS RDS (Amazon’s Paas-ish…
date: '2018-03-25T08:40:05.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/how-were-maintaining-sql-server-database-infos-in-git-df9dee6c6f5d
---

As part of our current migration from a legacy hosting provider to AWS, we’re moving a number of databases into AWS RDS (Amazon’s Paas-ish database platform).

_Note to the reader: This post is about automation on MS SQL Server. Be aware that “database lingo” is inconsistent between the various engines, and that “schema” and “database” has a different meaning in MS SQL than in Oracle, for example. Bear that in mind as you read!_

Most of our code using SQL Server is .Net-based and typically uses an [orm](https://en.wikipedia.org/wiki/Object-relational_mapping) such as Entity Framework to maintain control of the database schema and such. However, we wanted to see if we could build some automation around the databases themselves, something that would help us maintain control over logins, consistent database names across environments and in general keep it tidy.

As always in research-mode I started with a tweet:

The responses were interesting:  
 — Many pointed me towards schema-management types of products such as redgate and the like. We don’t need that, since apps maintain the schema themselves

– Some advised on using a “config db” where all the “configs” could be maintained (and this point it struck me how much domain affects the tools we build. The fact that DBAs will use databases for automation is interesting, but not surprising.)

So twitterz didn’t really help out a lot this time. But, I was pointed towards the SqlServerDsc module ([https://github.com/PowerShell/SqlServerDsc](https://github.com/PowerShell/SqlServerDsc)) which looked promising. This module is a set of DSC resources made for configuring all aspects of SQL Server, including provisioning databases, logins and permissions. The only problem was that it seems to assume that it will manage a “local” instance of SQL Server, which obviously wouldn’t work for us. After a bit of hacking in mofs and Powershell in a private fork of the repo, I had managed to add the required SQL Server authentication support to the 3 DSC Resources I needed, so that we could use it with AWS RDS. Essentially we’ll use a “jump host” where this code will run, which will talk to the instance running in AWS RDS. It’s easy to build Ansible roles on top of DSC, which provides flexible variable support and a (imho) more concise dsl than Powershell’s native DSC syntax.

After a quick chat with a few senior engineers, we decided that our needs were actually quite simple:  
– Provision databases across environments  
– Each database has \_one\_ owner login

There shouldn’t be any “criss-cross” permissions going on, although the model we came up with certainly supports that.

The role itself looks like this:

In order to use it, give it a list of databases, and a list of logins, as such:

this is a simplified version of what we use internally — we have a password lookup logic that we use to securely store references to passwords in git, and we also look at the environment and perform some variable-replacement there but that’s all mostly standard Ansible stuff. We don’t have an automated deployment pipeline for this either, tho I’m not sure it’s needed. We shall see!

And just as I was about to head home on Friday, I got a pull request from a developer needing a new database for his project, and I almost cried a little bit because it was such a beautiful and simple thing. Thanks friday-dev-dude!!