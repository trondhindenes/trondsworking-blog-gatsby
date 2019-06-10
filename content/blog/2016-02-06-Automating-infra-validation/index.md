---
title: Automating Infrastructure Validation using Pester, Ansible and Elasticsearch
date: "2016-02-06"
description: Automating Infrastructure Validation using Pester, Ansible and Elasticsearch
---

**Please note: This post has been copied from my archive, and probably misses formatting and pictures**

I’ve been pretty slow on the whole “Pester movement” lately – I’m simply not writing that many advanced PowerShell functions at the moment. However, Pester can do more than unit/integration testing of PowerShell modules. The PowerShell “Operation Validation Framework” uses Pester to invoke tests for verifying that the running infrastructure is configured as intended.

Unfortunately, OVF is not getting much love from MS, and the newest version of Pester has some changes which breaks the current OVF version. However, I don’t see any problems running Pester directly so we simply decided to skip OVF altogether.

This whole “infra testing” project was triggered by the fact that one of our network suppliers notified us about a planned fw upgrade causing downtime and stuff – and we found ourselves needing to perform a large number of tests in a short period of time to be able to verify the fw upgrade, and possibly ask to have the change rolled back if not everything went according to plan.

Here’s the process we designed:


In short, we have all tests in the same (for now) repo. Any changes to this repo triggers the usual CI Build/Publish module process.

We created an Ansible role which encapsulates all required activities for executing a task, such as making sure the nuget feed is configured as a package provider on every node, downloading the newest version of the “infratest” module, and executing the test. We already have a standard format for application logfiles being indexed by filebeat agents running on all servers, which means that as long as an application writes its log in a certain format, and places the logs in a certain directory (which the app can lookup using envvars), then those logs will be parsed and stored in Elasticsearch.

Since we have a defined set of tags which is deployed to all servers, we can tag any test to make sure that the test only executes on the relevant nodes.

Here’s an example of a single test for a single node in ES:


The “sourcecontext” field contains the name of the test, and “message” will be true/false depending on success or failure.

Since we already have a custom “inventory” dashboard running (which pulls data from various sources such as Ansible inventory, dns and datadog) we could plug this in easily. Here’s the “server view” of one server, with info about what tests were run the last 24 hours, and whether they failed or not:



There’s also a “global” test list where users can click to get the status of each host.

In time we hope to use this to build a “queue” of potentially suspect nodes, and feed that back in to auto-running Ansible jobs for remmediation.