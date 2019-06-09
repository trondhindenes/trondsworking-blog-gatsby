---
title: 'Replaying http traffic using Traefik, Kinesis Firehose and Aws Lambda'
description: ''
date: '2018-04-29T13:48:13.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/replaying-http-traffic-using-traefik-kinesis-firehose-and-aws-lambda-5727bdeba117
---

The challenge of realistic load testing is an issue that keeps reappearing on our radar at RiksTV. Due to a planned major rewrite of one of our most resource-intensive apis, time had come to do something about it.

The challenge of load testing (as we see it), is to be able to immitate “real” user traffic as closely as possible — simply hitting the same url over and over again and calling it a load test doesn’t do much good. In the past, we have made some progress based on taking existing traffic (as logged by our Elastic Stack) and feeding that into Artillery ([https://artillery.io/](https://artillery.io/)), but the setup is quite complex and not something we widely use.

I like the idea of “traffic replay”. I first learned about this a few years ago when I heard that JustEat ([https://www.just-eat.co.uk/](https://www.just-eat.co.uk/)) were taking live traffic and replaying it against their production environment, a form of “continous load testing”, and a very efficient safety valve in that they could at any time reduce their traffic by half in case of performance issues. With the advent of service meshes, advanced traffic replay capabilities are built-in to several of the most popular offerings.

While we’re dabbling with containers and Kubernetes, the majority of our services is still running on Windows VMs. Still, we wanted to see if we could rethink load testing / traffic replaying without depending on “container-only” technology.

As you might know, we’re huge fans of Traefik (https://traefik.io), both as a Kubernetes Ingress controller and as a “regular” load balancer. All of our AWS-based workloads essentially use the same pattern: AWS ALB → Traefik VMs → Web app VMs. Consul is used to auto-configure Traefik based on web app vms coming and going.

With this in mind, we created a POC consisting of:  
 - Streaming logs from Traefik to S3 via Kinesis Firehose: Firehose is a very performant log streaming service offered by AWS, which can be used for a variety of things. We use fluentd (https://www.fluentd.org/) to stream Traefik’s access log file (which is json-formatted) to S3 via Firehose. By basing our solution on the load balancer logs instead of the access logs in each web app vm, we get a more “complete” traffic picture, since we know more about the request and how the backend handled it.

\- AWS Lambda functions to parse the streamed log files and generate the “replay requests”. This is the only part of the solution that actually takes some coding, and I’m hoping we’ll be able to put it Githubs really soon. In any case, a Lambda function gets triggered by Kinesis placing logs in S3 (typically once every minute). It then processes the log lines according to a “rule file” (see snippet below). This generates a set of “replay requests” which is sent to a second Lambda function in async (non-wait) manner. We introduce some delays in this process so that requests are evenly spread out during the lifetime of the log processing function (this avoids spiking the replay requests).

As you can see, the “rule engine” has some interesting capabilities:  
\- Replay a percentage of traffic only (or multiply it)  
\- Rewrite the target hostname, so that prod traffic can be replayed against dev or staging  
\- Strip headers from the original request before replaying  
 - Match custom User-agent to avoid ending up in a “replay cascade”

![](https://cdn-images-1.medium.com/max/800/0*WvcVPLi-k6Cel_ij.png)

Here’s a screenshot from Kibana. The upper graph is production traffic against one of our apis, while the lower is the “Replayed” version, which is set to replay 1% of production traffic against our staging environment (this was ran with fluentd enabled on only one traefik instance, which is why the percentages don’t add up if you check them).

I’m really happy about this — it will allow us both to introduce artificial load against production, and also perform more realistic load testing against non-production environments. Developers can manipulate the “rule” file in order to enabling replaying on only the traffic they’re interested in.

There’s a few caveats tho:  
 - Traefik doesn’t log the request payload, which makes it problematic to replay POST/PUT requests  
 - We don’t (yet) have a way of manipulating the “Authorization” header, which is a problem if your staging environment is using a different user db from production.  
 - We want to add an automatic backoff-mechanism to disable replaying if backend latency raises above a limit or similar.

In any case, I think this will help us put more realistic load testing traffic on our systems, which again will help us build better services. All for the price of a Firehose instance and a few Lambda functions (which should be fairly minimal).