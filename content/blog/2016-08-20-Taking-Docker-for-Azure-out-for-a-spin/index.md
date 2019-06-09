---
title: Taking Docker for Azure out for a spin
description: >-
  As you may have read, I’ve been mighty impressed with the networking stack in
  Docker swarm mode. Today I got access to the beta of Docker…
date: '2016-08-20T17:45:44.000Z'
categories: []
keywords: []
slug: /@trondhindenes/taking-docker-for-azure-out-for-a-spin-f27fb955c9fb
---

Taking Docker for Azure out for a spin

As you may have read, I’ve been mighty [impressed](http://hindenes.com/trondsworking/2016/06/30/the-beautiful-networking-in-docker-swarm-mode/) with the networking stack in Docker swarm mode. Today I got access to the beta of [Docker for Azure](https://blog.docker.com/2016/06/azure-aws-beta/), which is is an offering aimed at getting you up and rnuning super-quickly using the public cloud. All you need is essentially a service principal and a ssh key.

In addition to the network goodness of docker swarm mode, docker for Azure includes some auto-provisioning which lets Docker handle load balancer configuration for you. So, if you publish a service on port 80, then Docker for Azure will make sure the load balancer and NSG rules are configured for that, and that’s what I thought I’d show in this post.

### Getting access

First, the docer for Azure thing is currently in private beta, so you’ll have to [request access](https://beta.docker.com/). Expect a week or so for this.

### Deploying the thing

Before you get going, you’ll need two things: An ssh key and a service principal. The last one isn’t too hard to configure yourself, but why bother — the good folks at Docker have create a docker image which will do it for you.

Using Docker for Windows, I simply spun up this container, which contains the scripts necessary to setup the required service principal:

docker run -ti docker4x/create-sp-azure sp-name

That script will procide you with a code, which you enter into a browser on your local computer, before signing in with an _admin_ user (that user must have permissions to create service principals in Azure AD). It will then give you the app id and secret which you need to deploy the template. The app name will be named “dockeronazure” and from the looks of it it’s getting contributor access to your entire azure subscription. I don’t quite understand why they don’t just give it access to the resource group instead of the entire thing, but that’s easy enough to tweak. If running the script yourself is not an option, it’s easy enough to create a service principal in the old portal (just make note of the app id and generate a secret). It doesn’t need any special permissions, as you can configure them in the “new” portal using the IAM link on either the resource group or on the entire subscription.

This service principal is used whenever Docer for Azure needs to interact with the AzureRM rest api, for instance to configure load balancers or perform port openings.

In my email invitation I got a link to start the deployment of the thing:

Note that when you sign up for the beta, you have to specify your subscription ID. The deployment will check this, so make sure you’re deploying to the right one if you have multiple subscriptions.

Here are the parameters you have to supply for the template deployment:

For testing you can safely scale down to a STANDARD\_A1 image. The lower 3 inputs are the most critical to get right.

### Running the thing

After the deployment is done, you should get a confirmation page from the deployment with two outputs; the ssh command you need to run, and the public ip of the load balancer placed in front of your containers:

using my favorite console (which of course is [cmder](http://cmder.net/)), i can simply log in to the manager node using my private ssh key.

So, now that the thing is running, lets give it a few services:

docker network create -d overlay nginx-net docker service create --name nginx1 --network nginx-net -p 80:80/tcp nginx docker service create --name nginx2 --network nginx-net -p 81:80/tcp nginx #Scale a bit docker service scale nginx=5 docker service scale nginx2=4

After a few moments, docker will have scaled the services correctly, which you can verify by running

docker service ls

Now, the interesting thing here, is that the Azure load balancer in front of these containers automatically gets updated with the corresponding rules. We configured one service on port 80 and another on 81.

Looking at the load balancer, it’s clear that the provisioner did it’s job:

And we can go ahead and test the services from a browser using the ip in the deployment output shown further up:

The nginx start page might not be the most exciting thing we could have published, but it serves as a very quick way of showing how Docker for Azure allows for a very tightly orchestrated experience — bring up a service and don’t worry about the networking thing — it just works.

This is just the start tho, much more is possible using “docker deploy”.

_Originally published at_ [_hindenes.com_](http://hindenes.com/trondsworking/2016/08/20/taking-docker-for-azure-out-for-a-spin/) _on August 20, 2016._