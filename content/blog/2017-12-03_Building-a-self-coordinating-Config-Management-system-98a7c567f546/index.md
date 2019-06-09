---
title: Building a self-coordinating Config Management system
description: ''
date: '2017-12-03T16:10:05.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/building-a-self-coordinating-config-management-system-98a7c567f546
---

If you happen to read this blog from time to time, the title shouldn’t come as a surprise — it’s a topic I’ve kept revisiting over the last year for multiple reasons. The most important of these is simply that I find the topic extremely interesting.

So just to set the stage: Now that we have our Ansible playbooks and/or or Chef cookbooks or DSC configs we’re able to fully automate the entire configuration of the servers (nodes) that we run. However, it turns out that just changing stuff on computers running in production and serving thousands of users isn’t a very good idea, because you might bring down the entire service by doing so. Back in the day this was solved with “maintenance windows”. Between 0200 and 0400 every other Sunday of the month, the server could do whatever it wanted, and it was okay to bring down the entire service if needed. In today’s day and age, this doesn’t cut it anymore. What if you need that change _ASAP_? We simply cannot afford to wait for 2 weeks until the next service window opens up.

Many organizations are solving this with so-called “immutable infrastructure” — the idea is that you never make changes to your infra, you rebuild it based on the new config. I like to call this “shift-left config management”, as it takes all the config management “gunk” and stuffs it into the server during the deployment process instead of while the server is in production. And if you’re able to manage your infra in an immutable way, it’s probably worth doing so: You get the benefits of testeability and the reduced risk that comes with never making changes to a production system (because change = risk).

However, there’s a good chance that you won’t be able to use this methodology 100% in your infra. You have nodes that are simply too stateful to allow a rapid provision/run/destroy scheme. Servers such as database servers, Elasticsearch or even stateful “runner-type” applications. So because of this (and because of the fact that many of our apps still are way too stateful to be able to go the “immutable infra” route), I wanted to see if we could build a modern way of managing stateful infrastructure.

Our first attempt was to add a layer of logic “on top of” our config management system (Ansible) that would coordinate jobs in such a way that we never brought down more an acceptable percentage of the servers running a service. We experimented with a separate DynamoDB-based database where all servers were stored, and using tags we would try and “map out” the right order of invoking a config management run (a “config management run” in this context is simply running _ansible-playbook_ against a server or group of servers). I think we could have made this model work, but it was getting complicated, with lots of logic around grouping groups of servers into “chunks” that could be updated together without risk, and so on (I wrote about this a while back).

Lately, we’ve taken a step back and tried to look at the problem with fresh eyes. This “refresh” has been fueled in part by the fact that we’re using Consul more and more — not so much for service _discovery_ as for service _coordination_ — especially since we’ve started using the Traefik load balancer in front of some of our external apis. Anyway. It struck me that we don’t need a complex central component to coordinate config management jobs, because nodes are perfectly capable of doing that themselves, using Consul as a “shared source of truth”.

![](https://cdn-images-1.medium.com/max/800/0*xrlZtixF05CGs04p.png)

In this example, 3 servers offer the same service (lets pretend it’s a public-facing api). Using Consul services, each server (potentially) knows about the other servers offering the same service, and can optionally lookup their _health state_ using the Consul api. So, if server1 and server3 both have problems, then server2 would be very stupid if it started reconfiguring itself based on an Ansible package.

So here’s what we built:

*   AnsibleJobService: This is a rest interface that takes a “job request”. A job request could be “run this playbook against all web servers”. It then uses multiple sources (such as the aws ec2 api) to figure out which servers should get updated. Each server gets targeted by a separate (and ephemeral) Ansible “job container” — these are provisioned using the Kubernetes api, and coordinated using SQS. For the diagram above, 3 pods would be started, each targeting a single server.
*   AnsibleConsul: This is a fairly simple Ansible module which simply returns “true or false” based on whether or not the server is okay to be taken offline, and initiates “maintenance mode” on the local server if true. It looks at the Consul services offered by the local service and makes a decision based on the state of itself and other servers offering the same service. Our Ansible playbook will simply retry this in a loop until it succeeds
*   AnsibleJobServiceFrontend: A fairly simple Aurelia app that allows some rudimentary job control and visualization of the jobs we kick off.

When a job is kicked off, all servers get the job in parallel (or close to it — we introduce a little bit of randomness just to err on the side of caution). The first node able to “maintmode” itself goes thru its entire config run, while other servers simply loop-wait for the first. The last task in our Ansible playbooks is a stop that disables “maintmode” which signals that the current server is back in production, and the next one can be processed. There are also parameters that can be set to control how many “offline” nodes it’s okay to have.

If multiple jobs are started that target the same server, AnsibleJobService will make sure that only a single job is released at a time against it.

![](https://cdn-images-1.medium.com/max/800/0*EoJ6tG6ANrasDfMl.png)

This picture shows the “live view” of a “multi-node” job. As you can see, 2 of the 3 servers are already done with their stuff, and the last one has kicked off, performing some IIS config changes.

I’m super-happy with all of this, because it reduces the risk that we used to have when invoking config management runs. With this new solution, anyone can trigger a job without the fear of taking services down — which again allows us to move faster and operate our systems without expert knowledge. A developer can simply PR a change, merge it, and then invoke the change against production — all in the time frame of a single cofee cup.