---
title: It’s not about Nano server or guis. It’s about modern vs legacy management tooling
date: "2016-05-09"
description: It’s not about Nano server or guis. It’s about modern vs legacy management tooling
---

**Please note: This post has been copied from my archive, and probably misses formatting and pictures**

I came across this article (https://www.petri.com/nano-server-debate-yes-no), fully knowing what the article was about just by looking at the author’s name.

Don’t get me wrong, I have nothing at all against Aidan Finn, but the whole premise for the article is wrong in my opinion. In short, the article explains how Nano’s lack of a GUI makes management more difficult for the “regular” IT shops – even the ones that have been known to have a “little collection of scripts” that they use.

In short: Nano is not for you. Nano is not for the small shop on the corner running Small Business Server 2003. It’s not for the medium-sized businesses mainly managing using “legacy” tooling (and I consider System Center a very good example of legacy). There’s nothing at all wrong with using GUis, it was what made Windows server so popular among SMB’s in the first place.

Or, to put it differently: If you’re not able to take your existing deployment/management stack and simply plug in Nano server with a minimal set of changes, it’s simply not meant for you. Sounds harsh, I know. But let’s look at the facts: Nano server doesn’t have a GUI. It will require you to be able to fully configure a server without touching it. If it’s a physical host, then your provisioning/configuration stack needs to be able to bring it into a fully workable state. Same thing if it’s a VM, although the provisioning part is probably a bit lighter. If something goes wrong with your server, you need to be able to shoot it in the head and redeploy, which means the the applications you run on Nano need to have resiliency against node failure built in. For a lot of modern web applications, this is trivial. The server is largely a stateless worker and easily scales out or in without users noticing it. For a single file server where spreadsheets are stored, not so much.

And just to clarify: “workable state” is not “look ma, I deployed a server”. Workable state means that the server does something meaningful. It runs an application which provides some sort of value to your employer or customer.

If you are already using modern tooling, this is not a big deal. You bring up and down servers year round. If they fail, you bring up a new one. If they fail in the same way often, you investigate. For you, Nano server is an interesting way of bringing down deployment time and node footprint.

However, if you’re still running servers “by GUI” there’s nothing at all wrong with that. The fact that this management model doesn’t scale in the same way as modern tooling doesn’t necesarily mean it’s wrong for every single company on the globe. It’s all good.

Looking at the comments section of that article tho, it is my clear opinion that people are getting it wrong, if they plan to use Nano for “HCP, DNS, SOFS, PKI, etc”. It’s not the  workload you put on your server that should dictate your choice of OS, its the management platform you have in place to, um, manage it. If you’re a “mostly gui” shop suddenly deciding to implement Nano-based DNS servers because “it seemed cool”, you are gonna fail. Hard.

So, don’t look at Nano server. Look at your management stack. If you’re already using some modern tooling and your config is safely versioned in git, you’re golden. If not, do yourself (and your users) a favor and just disregard Nano for the time being.