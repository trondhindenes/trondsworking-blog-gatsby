---
title: Things I learned about Cloudformation/Autoscaling Groups lately
description: >-
  During a CloudFormation stackupdate lately (we don’t do these super-often on
  large Auto Scaling Groups so we have lots to learn)
date: '2018-10-23T10:27:06.445Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/things-i-learned-about-cloudformation-autoscaling-groups-lately-ce03cd7f2c61
---

During a CloudFormation stack update lately (we don’t do these super-often on large Auto Scaling Groups so we have lots to learn), we discovered some behaviors that didn’t match our version of reality. I wanted to share this with the rest of the team, and the world — so:

Here’s our findings:

**The “IgnoreUnmodifiedGroupSizeProperties” attribute does nothing during deploy**

Initially, we thought this was how to make ASG accept the current min/max/desired size of the ASG, and to make that “win” over whatever was specified in the CloudFormation template. That was wrong. This is an attribute of the “AutoScalingScheduledAction” Update Policy, and as such has no effect during CloudFormation updates

**During upgrade, if UpdatePolicy is set to AutoScalingRollingUpdate, the ASG will always scale down to MinSize, regardless of MaxBatchSize. The only way to avoid this, is to configure the MinInstancesInService**

In other words, the ASG will always scale down to “MinSize”. The only way to avoid this is to use “MinInstancesInService”. Which is what I already wrote above. But I needed some text here, so.

**MinSize should be treated as “lowest acceptable number of instances”, e.g. should be equal to DesiredCapacity in most situations**

Because of the above, MinSize should probably be set to the same as DesiredCapacity for manually scaled ASGs. It should represent the absolute minimum (viable) number of instances you can accept for your ASG, and not less.

**If MinInstancesInService is set to the same as DesiredCapacity, ASG will add-before-remove during upgrade**

This simply means that if you want the upgrade to work by first adding a new instance before removing an old, MinInstancesInService and DesiredCapacity should be set to the same number.

**If MaxCapacity, MinCapacity is the same, and MinInstancesInService is configured to the same, the update will fail. This is quite logical, since ASG doesn’t have “room to grow”**

This one also kind of makes sense. ASG needs to be allowed to somehow add or remove an instance in order to replace old instances with new ones. If these numbers are all the same, there’s no way for the ASG to do that.

**Super-big disclaimer:  
**ASGs and Cloudformation is still a relatively new thing for us, and we’re still learning. There’s every chance that what I’ve written in this post is wrong.