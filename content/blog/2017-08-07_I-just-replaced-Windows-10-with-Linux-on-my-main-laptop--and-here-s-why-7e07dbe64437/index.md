---
title: 'I just replaced Windows 10 with Linux on my main laptop, and here’s why'
description: ''
date: '2017-08-07T22:55:58.000Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/i-just-replaced-windows-10-with-linux-on-my-main-laptop-and-heres-why-7e07dbe64437
---

As I’m writing this my computer is downloading some new bits — not from Windows update but from apt (wherever that may be). I just installed Linux on my main laptop, the one I’m using 8–15 hours a day to get stuff done and to learn things.

It’s funny, coming from a very Microsoft-centric background, to find myselv at the point where I realized that I wasn’t tied to Windows as the OS of choice anymore. I spend my days in Chrome, VSCode and Pycharm. That’s pretty much it. I used to rely on a Powershell-based terminal, but over the last year I’ve found that a bash-based (using Conemu/Clink) was better for me.

The main reason(s) I’m switching? Docker. Docker and Ansible.

To dig deeper: Here are my requirements for a well-working setup:  
 1. Not having to run a Linux vm in Hyper-V. Don’t get me wrong, Hyper-V is an awesome hypervisor. As a workstation hypervisor tho, it has some serious shortcomings, which are especially painful when running Linux guests inside it. Stuff like storage mapping, proper graphics drivers for high-resolution screens and robust (nic-independent) networking. Honestly I don’t understand why Microsoft haven’t moved Hyper-V out of “mmc hell” and given it a proper gui / workstation functionality.  
 2. To be able to run Linux-based containers both natively and thru Windows: In short: Our CI process uses Linux VMs, but most of our devs are on Windows. When coming up with tooling to support “dockerized dev workflows” I need to be able to test/verify scripts/etc on both native Linux and on Docker where the “Docker client” is running on Windows  
 3. To be able to test both “Docker for Windows” and “Docker toolbox”: Because of point 1 above I’m hesitant to demand that devs run Hyper-V on their workstations. Imho Docker toolbox with Virtualbox is a way better option for a good Docker experience on Windows. However, the Docker tooling in Visual Studio is for some reason tied to “Docker for Windows” — the suckiest of the options (at least right now).

All in all, I need flexibility in testing various combinations of Docker on Windows and natively. As far as I can see, the best way to get that flexibility is to run Linux on my computer and “nested virtualization” inside Qemu/KVM (Qemu 2.7 and up supports Hyper-V guests).

Apart from the Docker thing, I notice that I’m spending less and less time in what used to be my “main” tools — the Powershell console and the Powershell ISE. Most of my “automation work” is done using Ansible, which day-to-day means editing a bunch of yaml files (Ansible uses yaml-based configs) which I can do in VS Code regardless of OS. Running natively on Linux also gives me a better testing experience when developing Ansible stuff, although I’ve had great success with Bash on Windows for the last year as well.

So: It’s still early but I feel good about this. I have my main editors (Pycharm and VS code) and both are working well. I can du whatever I want as far as VMs go using Qemu/KVM, and virt-manager gives qemu noobs like me a familiar interface to manage vms. I can write .Net core apps, and even run Powershell 6.0. I have spotify and chrome. So far, there’s not really anything I can think of that I’ll miss, except for the “full” Visual Studio — which I’m not spending too much time in anyways.

Gory details about my current setup:  
 OS: Ubuntu 17.04 (Qemu 2.7 comes bundled with this version of Ubuntu, which is why I chose it)  
 Main terminal: [terminator](https://gnometerminator.blogspot.no/p/introduction.html) (updated to 1.9 to get rid of some bugs)  
 IDE’s: Pycharm / VSCode  
 RDP client: myrdp (https://github.com/szatanszmatan/myrdp)  
 Frameworks/Platforms: Python 2.7/3.5, .Net core 1.0.4, Powershell 6.0 beta