---
title: >-
  Exploring hybrid request routing in order to support strangler-pattern
  migrations to Kubernetes
description: >-
  This one has been on my mind lately, so I thought I’d write it down as I’m
  writing a proof of concept:
date: '2018-10-21T16:01:30.969Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/exploring-hybrid-request-routing-in-order-to-support-strangler-pattern-migrations-to-kubernetes-7280b10058d1
---

This one has been on my mind lately, so I thought I’d write it down as I’m writing a proof of concept:

As you may already know, we’ve started using Kubernetes more and more at here at [RiksTV](http://rikstv.no), also for customer-facing services. However, the bulk of our services still run on so-called “.Net Classic”, and these services will likely be with us for years to come. Today our stack looks (very simplified) like this:

![](https://cdn-images-1.medium.com/max/800/1*0pFI5QXFTSvuLuoGBqKgpA.png)

As you can see, we’ve completely decoupled Kubernetes from the “traditional vm” layer, where we use Traefik and Consul for http request routing. The “App Service” box in the drawing illustrates an app running on traditional vms.

I’ve been thinking lately — maybe this isn’t such a good idea. Let’s say we have “super-gigantic-api” running using regular VMs, and we want to start breaking this up into smaller services using Kubernetes. We might for instance want to route “super-gigantic-api.rikstv.no/v2” to Kubernetes, while all other requests to that domain name continues to be routed to the old vm-based service. We don’t have this capability today, which made me think:

What if we simply expose all Ingress rules in Kubernetes as Consul services, and hook our Kubernetes nodes onto our “regular” Traefik/Consul-driven stack? Something like:

![](https://cdn-images-1.medium.com/max/800/1*41ESwHyU-LTuOPx0ufrhIQ.png)

(I’ve drawn “data path” as red here, and “control path” as blue).

This would allow us to perform migrations without replacing any hostnames, and it would even (in theory) allow us to perform canary-routing between a vm-based service and a Kubernetes-based one.

What we’d need:

*   Consul Installed on Kubernetes nodes. This is not a biggie
*   A watcher looking for Ingress changes (CRUDs) and for each change, update Consul. This watcher could be either in the form of a DaemonSet (one per node), or a cluster-wide service that would update the consul agent on each node. Both are totally viable.

We’d also need some logic for setting up the necessary “translations” between Kubernetes Ingress objects and Consul services. Since we’re using Traefik both as “inner loadbalancers” and Ingress controllers, we have a pretty good picture of what this would mean. For instance, if the ingress had the annotation “traefik.ingress.kubernetes.io/rule-type: PathPrefixStrip”, we’d replace that with a Consul Tag containing the corresponding value. We’d also remap the destination port since our Ingress controllers are running on custom ports on each Kubernetes node.

There are some design decisions needing to be done regarding path manipulation. Traefik (and other similar products) support “path prefix” manipulation where for instance “api.stuff.stuff.com/api/v1/shoes” would be routed simply as “/shoes” to the backend. Since we’d be running two chained Traefik instances (innter load balancer layer + ingress controllers) we’d have to figure out how such path manipulation should be done, and which instance in the chain would be responsible for it. Maybe we’d simply use some custom Ingress annotations to control it.

Apart from that, I think this should be fairly easy to do. Will let you know how this goes!!