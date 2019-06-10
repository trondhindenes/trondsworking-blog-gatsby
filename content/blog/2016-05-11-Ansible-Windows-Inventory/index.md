---
title: Using Ansible as a software inventory db for your Windows nodes
date: "2016-05-11"
description: Using Ansible as a software inventory db for your Windows nodes
---

**Please note: This post has been copied from my archive, and probably misses formatting and pictures**

If you read this blog from time to time, you won’t be surprised by the fact that I’m a huge fan of Ansible. If you don’t, well – I am.

Ansible is really good at doing stuff to servers, but you can also use it to collect stuff from servers. There’s a builtin module which actually gathers a bunch of information about your infrastructure by default, and the cool thing is that that’s very much extensible. And very easy do to. So, since the wind was howling outside today and I had a Jira task regarding some package cleanup waiting for me, I decided to build a neat little software inventory thing using Ansible.

Note that this post requires some prior knowlegde with Ansible, I won’t go thru all the things.

The first thing I needed was a PowerShell script which let me collect info about all software on each node. I came up with this little thingy:

```
$packages = Get-WmiObject -Class Win32_Product
$returnpackages = @()
foreach ($package in $packages)
{
    $PackageObj = "" | Select Name, IdentifyingNumber, Version, Caption
    $PackageObj.Name = $Package.Name
    $PackageObj.IdentifyingNumber = $Package.IdentifyingNumber
    $PackageObj.Version = $Package.Version
    $PackageObj.Caption = $Package.Caption
    $returnpackages += $PackageObj;$PackageObj = $null
}
$returnpackages
```

Now, In order for Ansible to use that script you need to point Ansible to a folder where the script lives. I decided to do it like this:
```
        - name: copy custom facts file
          win_copy:
            src: softwarefacts.ps1
            dest: "C:\\Scripts\\facts"

        - name: gather extra facts
          setup:
            fact_path: "C:\\Scripts\\facts"
```

This is a playbook solely responsible for gathering various pieces of information. So, as this runs, Ansible will execute the “softwarefacts” script and add it to the list of “known stuff” about the server.

The problem is, by default this info is not persisted anywhere. Ansible has some built-in support for storing facts in Redis, but that’s meant as a way of speeding up the inventory process, not storing the data indefinitely.

So, here’s what I do:
The last part of my “inventory playbook” looks like this:
```
    - name: Set intermediate fact
      set_fact:
        vars_hack: "{{ hostvars[inventory_hostname] }}"
    - name: remove temp folder
      file:
        path: "/tmp/ansiblecmdb"
        state: absent
      failed_when: false
      delegate_to: localhost

    - name: create temp folder
      file:
        path: "/tmp/ansiblecmdb"
        state: directory
      delegate_to: localhost

    - name: Dump all vars
      action: template src=templates/dumpall.j2 dest="/tmp/ansiblecmdb/{{ inventory_hostname }}.json"
      delegate_to: localhost

- name: add to db
  hosts: localhost
  tasks:
    - name: add to db
      script: app.py
      delegate_to: localhost
```

What I do here, is that I store each node’s info in a temp variable, and then use a template to write that to disk on locally on the Ansible control node (the “dumpall.j2” template simply contains “{{ vars_hack | to_json }}”)

Lastly, I have a python script which will dump these files (one per node) into a RethinkDB database, which is the last step executed by Ansible:

```
#!/usr/bin/env python

import os
import rethinkdb
import json
import rethinkdb as r

from os import listdir
from os.path import isfile, join


tempfolder = '/tmp/ansiblecmdb/'
onlyfiles = [f for f in listdir(tempfolder) if isfile(join(tempfolder, f))]

for file in onlyfiles:
    print(file)
    host_name = str(file).split(".")[0]
    with open(os.path.join(tempfolder, file)) as data_file:
        data = json.load(data_file)

    r.connect("localhost", 28015).repl()
    try:
        r.db_create('ansible_facts').run()
    except:
        pass
    try:

        r.db("ansible_facts").table_create("ansible_facts").run()
    except:
        pass


    #check if we have data
    cursor = r.db("ansible_facts").table("ansible_facts").filter(r.row['inventory_hostname'] == host_name).run()
    if cursor.items.__len__() != 0:
        r.db("ansible_facts").table("ansible_facts").filter(r.row['inventory_hostname'] == host_name).delete().run()

    r.db("ansible_facts").table("ansible_facts").insert(data).run()
```

(word of caution: Now that RethinkDB is closing shop, you might be wise going with another DB engine. The procedure should be roughly the same for any NoSQL db tho).

Using RethinkDB’s super-nice web-based data explorer I can query the db for the full doc for each of my nodes:

```
r.db('ansible_facts').table('ansible_facts').filter({"ansible_hostname": "servername"})
```
After executing the playbook I can query the RethinkDB database for the list of software installed on one of my nodes:

We already have a simple front-end getting data from this database using a super-simple rest api written in Flask, and implementing support for software facts took me about 20 minutes.

Go make something!