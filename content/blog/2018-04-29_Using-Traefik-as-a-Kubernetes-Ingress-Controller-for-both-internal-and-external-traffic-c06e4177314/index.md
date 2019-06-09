---
title: >-
  Using Traefik as a Kubernetes Ingress Controller for both internal and
  external traffic
description: ''
date: '2018-04-29T09:53:01.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/using-traefik-as-a-kubernetes-ingress-controller-for-both-internal-and-external-traffic-c06e4177314
---

We’re super-happy with our [Traefik](https://traefik.io/) setup, and since there seems to be a lot of discussions around Traefik and Kubernetes, I thought I’d share some info about our setup. Don’t consider it “reference” by any means, rather “some ppl do it this way and it’s apparently working pretty well”.

We have a ton of rest apis that we do not want to expose on the internet. These may be strictly internal because they don’t have AuthZ/AuthN in place, or maybe there’s just no point in them being available on the internet.  
 In any case, we had to design our ingresses with this in mind (and yeah, I’m fully aware that there’s no such thing as “internal” anymore).

For each of our Kubernetes clusters, we run 2 AWS Application Load Balancers (ALB), one internal and one external (this is selectable when you create the ALB). These are provisioned as part of the CloudFormation template that drives the configuration of the worker nodes in each cluster.

Each ALB has two listeners, http and https. Https-traffic is terminated at the ALB, which means that we don’t deal with ssl traffic internal in our cluster. This is another potential weak spot in our security, and we’re looking at ways of enabling “last-mile” SSL — but we haven’t done it yet.

So, we have 2 ALBs, each with two listeners (http + https), which means 4 “target groups” in AWS lingo (the “destination” of each listener in a load balancer):

external-http → 10002  
 external-https → 10003  
 internal-http → 10000  
 internal-https → 10001

each of these target groups match up to one DaemonSet, which means that each Kubernetes worker has 4 instances of Traefik running. Here’s one of the 4:

Note the “TRAEFIK\_LABEL\_SELECTOR” — we run a simple init-script inside the Traefik container which inserts this as the “labelselector” setting in the traefik config file, but you can probably do it using the default Traefik container image with cmd parameters aswell.

This means that for developers who want to expose their apps thru an ingress, they can label each ingress rule with one of the following labels:  
 — expose: internal-http  
 — expose: internal-httpsecure  
 — expose: external-http  
 — expose: external-httpsecure

Base on these labels, the correct Traefik daemonset will “activate” the ingress as a rule, and traffic will flow.

This also has the benefit of a “blast door” between the internal and external listeners, as well as between http and https traffic — it’s not possible to simply manipulate the host header in order to “fake” an internal request, which is a typical weak spot we’re seeing in other setups.

There are a few “challenges” with our setup: Traefik itself has no idea if the traffic is secured over SSL or not, since SSL is terminated at the ALB. This makes it hard to use Traefik’s builtin rules for auto-redirecting to https and similar. We solve this by each service providing a “redirect image” which is a super-light node app, typically running in a separate container in the “app pod”.

A typical ingress rule for an app can look like this:

(We use Jinja2-templating on our manifests, which is why it looks a bit wonky).  
 This ingress will end up as an “internal “rule over https.

In general this setup is working really well, and so far we’re super-happy with Traefik — both as an Ingress controller and as a “regular” load balancer/traffic router for our non-containerized things.