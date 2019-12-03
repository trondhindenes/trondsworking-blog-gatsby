---
title: Testing in production aka user-based dynamic api routing
date: "2019-12-03"
description: How we implemented user-based dynamic api routing using feature flags, Lambda@edge and Traefik
---

We've been discussing testing in production for a long time. Especially for our "main" api we knew we needed to do something in order to improve the way we develop and deploy. This api relies on production (or production-like) data, and is also the primary contact point for a host of different clients (both apps, set-top boxes and web apps). 

We wanted to see if we could implement a more dynamic way of routing requests, without changing anything client-side. Here's what we came up with:

## The life and times of an api request from a RiksTV/Strim app
Clients get a jwt token from an auth service, and this token is passed in the header of every api request to identify the user. Pretty standard stuff.

## Birds-eye view of the request path (before we changed everything)
Requests hit a load balancer (we use AWS ALB), where ssl termination happens. Requests are then passed on to one of our Traefik instances (we call this the "inner load balancer" layer). Traefik is hooked up to Consul, and has a real-time view of which instance it should forward the request to. All good.

## Feature-flagging the jwt
Since the jwt header "follows" requests all over the place, we decided to add a "beta" flag to the jwt. We added a small piece og logic to our auth service, which uses Launch Darkly to set this flag for internal users. Nothing fancy, just: "if user is a beta user, add a `beta` attribute to the jwt". 

## Why Lambda@Edge
Traefik is awesome in that it can make routing decisions based on a lot of request attributes. If header xyz is set, route to backend A, if not route to backend B and so on. However, it is _not_ able to decode a jwt token and make routing decisions based on it. So, we needed `something` to decode the jwt and optionally add some information Traefik could understand (such as a request header) _before_ the request passed thru Traefik. We decided on Lambda@edge here. I won't go into detail about Lambda@edge, but think if it as tiny serverless functions that can execute on the edge of the network. So, requests are inspected by Lambda@edge, and if the jwt contains the `beta`attribute, we add a `X-RiksTV-Beta: true` header to the request before passing it on to the AWS ALB.

## Driving routing configuration using Consul Tags
I've written about our Consul/Traefik stuff before (there's even a video of it in Traefik's youtube channel), but essentially tags on the Consul service for each api server is used to dynamically configure Traefik.

We have one Autoscaling group called "beta", whith rules along the lines of:
- if host is `api.rikstv.no` and the `X-RiksTV-Beta` flag exists and is set to true, route it here
In addition, the "main" autoscaling group has a rule like this:
- if host is `api.rikstv.no`, route it over here instead

Traefik evaluates rules ordered by length, the longest will "win". It's also possible to set weights to override this behavior.

## Piecing together the pieces
So, as a developer I can log into Launch Darkly and mark myself as a "beta" user. I refresh my credentials in whatever app I want to test from, and from there I know that my requests will hit the "beta" instance, which typically will run a newer release of our api code. We have logging attributes that allow us to sepearate "regular" from "beta" traffic, so that we can compare response times and similar.

I'm really stoked about this, as I think it will solve a bunch of headaches, and enable real-life testing of changes without affecting paying customers. Even tho this api is running on regular (old-school) Windows VMs, its still possible build a modern request routing flow.