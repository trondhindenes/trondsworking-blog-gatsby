---
title: "Ansible + Windows: What we’ve learned from 6 months in production"
date: "2016-12-21"
description: "Ansible + Windows: What we’ve learned from 6 months in production"
---

**Please note: This post has been copied from my archive, and probably misses formatting and pictures**

One of the first tasks I started with at my current customer when we begain working togehter back in May, was to introduce the notion of configuration management. What I told them:



Obviously it’s not as clear-cut as this – there are a multitude of other things in play regarding choosing a configuration management solution. Still, coming from an environment with mostly manual config/deploy, whichever modern tool you choose will likely give you awesome results.

Customer is mostly a windows shop, running (for now) on a very traditional stack of Windows 2012R2. Parts of the stack run on NodeJS, but that’s (mostly) outside of my scope. For now.

A couple of parellell initiatives also caused us to ramp up our cloud usage – among others we were in the process of deploying a “production-grade” Elasticsearch cluster for log ingestion, and this turned out to be a great starting point for our Ansible efforts.

Lesson learned: Don’t do all at once. Build configuration piece by piece. Iterate. Repeat.
I simply started with the beginning: What do we need for _all_ our servers to make them go from freshly deployed generic vms to a “base config” we could build on? At first, it wasn’t much but later it turned out it was great to have a role where we could stick stuff that we wanted configured on every single server. Our first Ansible Role was born. Later, this is where we would stick things like monitoring agent install and base config, generic environment variables and things like that. We also built a special “AzureVM” role which is only run on freshly deployed Azure servers (we have some other providers too) which configures data disk setups and similar azure-specific things.

Deploying Elasticsearch on Windows using Ansible
Turns out Elasticsearch is surprisingly easy to deploy: Java, env vars, and unzip a few packages. We stuck the Elasticsearch config in a template where the names of all nodes get auto-generated from Ansible’s inventory. Worked well. For Logstash (we have a looooot of logstash filters) we decided to create a role, since it was more complex. I noticed that the builtin “windows firewall” module for Ansible wasn’t all that good, so I turned to one of my own projects (https://github.com/trondhindenes/AnsibleDscModuleGenerator) to generate a DSC-based module for firewall configs instead. Much better.

Lesson learned: Use DSC-based modules where the builtin ones don’t do the trick.
I spent a loooooong time figuring out how to deal with different environments. We created some roles for provisioning Azure stuff – among others we have a “deploy vm role” which performs a truckload of validation and configuration. We built this stuff on top of my “Ansible-Arm” modules (https://github.com/trondhindenes/ansible-arm-deployment) , which allow us better control of azure stuff than what the builtin roles do. Mind you, this is very much “advanced territory”. Still, using this approach we can fine-tune how every vm comes up, and use Jinja2 templating to construct the json files which forms the azure resources we need.

For inventory, we’re running a custom build of my armrest web service (https://github.com/trondhindenes/armrest). Actually, we’re running 4 instances of it, each pointing to its own environment (dev/test/uat/prod), which gives us 4 urls. In Ansible we have 4 corresponding “environment folders”, so when I point to “dev”, Ansible knows which webservice to talk to in order to grab inventory. Armrest also does some magic manipulation of the resource group names – especially stripping the “prod” or “dev” etc names from each RG, so that we can target stuff in playbooks which will work across environments. An RG called “dev.mywebservers.europe” will get the group “mywebservers.europe” in Ansible’s “dev” inventory, for instance. All fairly easy to do, and all super-flexible.

Using armrest we also rely heavily on azure’s “tags” feature, as these get translated into hostvars by Ansible. We used this to target playbooks where only a subset of the servers in a RG should perform a specific Ansible task.

For instance, this playbook:
```
---
- name: configure logstash nodes
  hosts: euw.common.es-logging
  tasks:
    - name: separate out logstash nodes
      failed_when: false
      group_by: 
        key: "{{ application }}"
 
- name: Basicconfig
  hosts: elasticsearch
  roles:
    -
      role: rikstv_basicconfig_azurevm

```

Gets applied to Azure vms with this tag:


note that armrest strips away the “ansible__” prefix and presents the rest as hostvars.

So, this allows us to control config using tags and resource groups, which we again can provision using Ansible (during VM deployment, Ansible knows to add the “winrm” tags to Windows vms which we deploy. Linux vms get another set of tags).

As for deployment, we have 3 “main” repos: Ansible playbooks, roles, and a separate one for Ansible-based azure deployments. These get bundled up into one “ball” by our CI process (teamcity), and deployed to our “Ansible server” using Octopus Deploy.

Configs are invoked manually, either by ssh-ing to the Ansible node, or by using flansible (https://github.com/trondhindenes/flansible) rest calls.

We need to come up with a more structured way of testing changes. Right now we deploy to “dev” first, and if stuff looks good, we push to prod. Note that batch sizes and the small rate of change allows us to do this. Bigger environments with more stuff going on will likely require more stringent testing procedures. I’m also super-thankful for WSL in windows 10, which lets me smoketest stuff before I commit to source control.

A few weeks back we got to test our stack as we essentially redeployed our entire Elasticsearch cluster node by node. Without Ansible there’s no way we would be able to do that in a couple of hours without downtime. And the vast majority of that time was spend waiting for Elasticsearch to sync indices.

We’ve also used Ansible to push a large number of custom settings for our pethora of IIS nodes, stuff related to logging, IIS hardening, etc. The fact that we now can produce a “ready to go” IIS instance with filebeat indexing logfiles and all other required settings without manual intervention is great, and it already allows us to move a _lot_ faster than what we were used to. I’d stil consider us “too manual” and not “cloud-scale”, but we’re slowly getting there, and Ansible has helped us every step of the way.

Lesson learned: Don’t over-engineer. One step at a time. Start today!