---
title: 'Exploring distributed tracing using Traefik, Jaeger and Flask'
description: ''
date: '2018-05-14T18:48:42.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/exploring-distributed-tracing-using-traefik-jaeger-and-flask-4f1835c8ed8d
---

![](https://cdn-images-1.medium.com/max/800/0*qgK9folx8KYdFe_E.png)

Here at RiksTV ([www.rikstv.no](https://www.rikstv.no/)), we are always looking for ways to improve or insights into how our apps are doing. We currently have a well-working Elastic stack set up, but we’re definetely seeing shortcomings in just relying on logs. That’s not Elasticsearch’s fault btw. We’ve also looked at several of the commercial offerings, but none of them seem to… click. Some are super-expensive, and some are just… weird (looking at you, Azure App Insights).

Before I move on, it might be an idea to spend a few sentences of what problem we’re trying to solve: As apps become more and more distributed — either in the form of containers or just plain ol’ vms — traditional logging is becoming an increasingly lacking way of keeping track of application health. Even with centralized logging, it’s almost impossible to figure out how the log statements from different apps fit together. This is where distributed tracing comes in. The idea is simply to have some ‘thing’ that follows the operation around, all the way from the network edge and into the “core” of the application. This ‘thing’ enables us to group related bits of information together, and present it in a meaningful way.

There’s a ton of activity in the open-source space around tracing and instrumentation, so I decided to have a closer look. OpenTracing can be thought of as a standard for distributed tracing, which is implement in various tools such as Jaeger and Zipkin. Commercial actors (New Relic, Datadog, others) are also implementing OpenTracing support in their APM products.

You might actually get quite far without touching your application code at all — projects such as the Traefik load balancer and several of the more popular service mesh projects can emit OpenTracing-compatible data, which can be picked up by Jaeger or similar. That said, I think it’s safe to say that tracing is only as good as the effort you put into it. If you want _real_ instrumentation, you’re going to have to put tracing calls in your code. I did this exercise on one of our internal endpoints, and for a relatively simple rest service a few lines of extra code takes you surprisingly far.

Anyway, I wanted to show how all of this fits together, so I put together a little “all-in-one” demo using Traefik, Jaeger and a simple Flask ([http://flask.pocoo.org/](http://flask.pocoo.org/)) app. If you’re interested in taking a closer look at tracing I hope this can serve as a decent starting point.

You’ll find the repo at [https://github.com/trondhindenes/Traefik-Flask-Opentracing-Blogpost](https://github.com/trondhindenes/Traefik-Flask-Opentracing-Blogpost). The the repo readme should contain all the needed instructions, but here’s an overall description of what gets set up:

*   Jaeger: Traces need to be sent somewhere so they can be stored, visualized and filtered. Jaegers “all-in-one” containers makes it super-easy to get up and running with all you need, including the agent which receives the actual traces from your various components. Jaeger also has the “jaeger query” which is the web ui you’ll use to investigate traces.
*   Traefik: As of version 1.6.0 the Traefik load balancer can emit traces to a Jaeger agent. The repo includes a working setup for two microservices configured in Traefik, with tracing enabled and ready to go
*   Code instrumentation: In my example app, I’m using the Flask microframework, along with a few opentracing libraries for instrumenting data from inside the running app. This allows traces from specific parts of your code, which can provide a ton of useful information if done right.

If you’re interested, I encourage you to clone the repo and walk thru the readme. It shouldn’t take more than a few minutes to have a well-working tracing demo up and running on your machine.