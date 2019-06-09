---
title: Building an testing VM images
description: ''
date: '2018-02-11T17:00:08.000Z'
categories: []
keywords: []
slug: /@trondhindenes/building-an-testing-vm-images-403d68b5eacf
---

As we’re moving to a more immutable infrastructure…. Oh wait.

As we’re moving to a more disposable infrastructure, there’s an increased reliance on having processes around creating robust images to build vms from.

Up until now we’ve been using Ansible to call Packer, but it’s time to do some refactoring. Our current process has a few weaknesses:  
 — Images are hard to test before “go-live”  
 — It’s hard to get log output from the process. Since we’re injecting AWS credentials (which we do \_not\_ want logged anywhere) we basically have to turn off all logging from Packer’s output.  
 — It’s hard to integrate with existing config management tools: Packer has an Ansible “provisioner”, but it doesn’t support reboots which makes it difficult to use existing code in our packer builds.

So, we set out to make something better. The new process is more complex, but improves on all 3 pain-points I’ve listed:

![](https://cdn-images-1.medium.com/max/800/0*ledCYczCslQOTu0i.png)

This is all driven by Ansible. Mind you, there is a bit of custom stuff in our playbooks to deal with temporary vms coming and going, but we’re used to that. Ansible definitely has its quirks.

Things that are better now:  
 — We get better logging, because instead of mashing all the things into ugly bash/PowerShell scripts, we use Ansible’s native (and super-broad) support for configuring instances. This makes it \_so\_ much easier to find problems in the process.  
 — We can reboot the base vm at any point, without Packer getting sad  
 — We can use all the gazillion lines of code we already have in the form of Ansible roles and modules to configure our vms

The new model will be run on a schedule, we try and regenerate all of our images once every week. A “base vm” is spun up and configured in regular Ansible fashion. In time we’ll probably be more granular here and generate unique images for each of our unique requirements. This will enable us to do a lot less than we do today when we provision vms, as most of the “meat” will already be in the image.

After the “base vm” has been configured, we shut it down (the process differs a tiny bit between Linux and Windows here), and create a “candidate image”. All images are versioned with today’s date. When the candidate image has been created, we spin up a test vm based on that image. This allows us to verify that the image creation worked as intended. Inside the test vm we can use “standard” test suites such as [Pester](https://github.com/pester/Pester) and [Inspec](https://www.inspec.io/) to verify that everything is as it should be.

At this point we know that we have a “good” image. We create a copy of the “candidate” image and mark it as “good” and ready for production.

We have separate processes that makes sure Cloudformation/Autoscaling-based instances are always based on the latest image, hopefully I’ll find some time to write about that in the near future.

One important thing we’ve learned along the way:  
 — If using Cloudformation/Autoscaling groups, its a good idea to generate unique images — for example by naming them with today’s date. You want to make sure that the Autoscaling service is always able to create a vm based on the source image in the LaunchConfig for the group, and this gets broken if you reuse the same image name when you create new ones. Unique image names allow you to control when to “upgrade” your Autoscaling groups to the new image independently of when it was created.

All in all I’m very optimistic about our new (of somewhat more complex) process. I’m a firm believer in “shift-left” and building “full-featured” as opposed to deploy-time-configuration — but it requires a better verification cycle. Don’t build bad images, folks.

Anyways, this might not be the most cutting-edge technology in itself, but revamping this stuff will allow us to build other, more interesting things. Very worth it.