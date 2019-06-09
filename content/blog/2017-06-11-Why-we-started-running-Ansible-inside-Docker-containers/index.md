---
title: Why we started running Ansible inside Docker containers
description: ''
date: '2017-06-11T19:31:14.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/why-we-started-running-ansible-inside-docker-containers-15ffbc819558
---

We’ve been using Ansible for about a year now to manage our (mostly Windows) vms and cloud resources, and it’s been mostly a success story. That’s not to say that config management and automation is easy — the time it takes to “reverse-engineer” a complex infrastructure that’s been manually (mis)treated for years is not to be underestimated.

Our Ansible codebase has grown exponentially in size and complexity, containing a multitude of roles, custom modules, callback/lookup lugins and regular playbooks. I realized a while ago that we would need to come up with “something” in order to alleviate some very obvious pain points, which is why I started looking at Docker.

Just a quick background on our stuff:  
 Our Ansible code (scripts) is split into 4 separate repos: playbooks, roles, modules+plugins, and cloud configuration playbooks. These get “built” whenever one of them changes, and published to our internal nuget server. From there Octopus Deploy lays them down on disk in the right folders on our “Ansible server”. (The “Ansible server” is simply a linux vm where the required stuff is installed).

This has caused a few problems lately:  
 1. Testing is hard. Sure, I can do some smoketests locally, but we don’t currently have a good way of doing efficient testing  
 2. No blue/green releases: Since we have a single “Ansible server”, any version deployed there would affect all environments (dev, staging, prod, etc). This is increasingly risky  
 3. It requires some specific knowledge to kick off an Ansible playbook, either using ssh or [flansible](https://github.com/trondhindenes/flansible).

So, that’s what we set out to fix. We’re already running Rancher for a truckload of our “utility” services so I started building a docker image pipeline containing the “base install” of Ansible. The actual Ansible version is configurable, so that we have the option to run our playbooks using both released and development versions of Ansible. The plan is to do nightly or weekly builds of these, so that we’ll be able to stay up-to-date against the Ansible devel branch.

Most of the “smarts” happens when the container starts, not at build time. This is important as it lets us inject options at run-time. When starting up, the container gets fed info about:

*   the playbook path to run
*   the environment its in (this is used to download some environment-specific config stored in s3)
*   the versions of the 4 “ansible repos” to run (these can also be set to “latest” and “release”/”prerelease”.
*   The environment to run against (dev/test etc)

Side note: The “pull ansible repos” part was actually the hardest to implement. Since we’re a “mostly .Net” shop, nuget is the de-facto artifact format. I quickly discovered that nuget simply does not work on linux if used outside of .Net core tooling, and found myself fighting mono versions, ssl trusts and thousand other things. Needless to say, we scrapped all that and built our own nuget client in pure python, which is able to pull the right version (or simply the latest) of a package from our nuget server.

This allows us for example to test new versions of our playbooks/roles/modules against our dev environment, only “releasing” to production when the changes are verified. We can also break up the CI job that currently deploys all 4 ansible repos into separate, smaller jobs, since there’s no need to have these aligned with each other anymore.

We invoke these “Ansible Jobs” (as I call them) using the excellent Rancher [api](https://docs.rancher.com/rancher/v1.6/en/api/v2-beta/) from a separate webservice which serves as the job coordinator. The Ansible docker image contains a callback posting back to the coordinator’s rest api, which allows the job coordinator to track the status and result of each job.

We’re just barely scratching the surface on this, and we plan to build some more automation on top of this new capability — for instance the ability to continously execute Ansible playbooks against our environments without any intervention. We also plan to implement mutex-like functionality to ensure that we don’t execute multiple jobs in paralell against the same parts of our services.

There’s still lots to do, but I’m super-happy about this new direction we’re taking with Ansible.