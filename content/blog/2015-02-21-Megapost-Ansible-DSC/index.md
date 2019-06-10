---
title: "Megapost: Getting up and running with Ansible and DSC"
date: "2015-02-21"
description: "Megapost: Getting up and running with Ansible and DSC"
---

**Please note: This post has been copied from my archive, and probably misses formatting and pictures**

So, you want to try out this Ansibe and DSC thing. Problem is, you don’t know too much about Ansible or Linux. Fear not. This post is my attempt to guide you through a completed setup of Ansible controlling a Windows server and doing some config stuff on it.

What you will need:
1. A Windows 2012R2 VM up and running. Keep it non-domain joined for now. Make sure you have the PowerShell WMF5 preview installed (which you can grab here:
http://download.microsoft.com/download/B/5/1/B5130F9A-6F07-481A-B4A6-CEDED7C96AE2/WindowsBlue-KB3037315-x64.msu )

2. On the same network as the Windows VM, we are going to set up an Ansible “control node” using Ubuntu 14.04. This post will guide you through that process, but make sure you set it up so that the Ansible VM can access the Windows VM. Start out with the Ubuntu installer ISO, which you can grab here: http://www.ubuntu.com/download/server

3. I use WinSCP to copy stuff from my Windows computer to Linux. You can find that here: http://winscp.net/eng/index.php. I also use putty.exe for my ssh client

Getting Ubuntu up and running:
With the Ubuntu ISO downloaded and mounted, fire up the control node vm. Note that in the pics below I’m using a Norwegian keyboard, though obviously you’d change that to fit your own locality or whatever:
2015-02-21 14_30_32-Ansible - VMware Workstation

Installing Ubuntu is pretty simple: Choose your language, and select “Install Ubuntu Server” on the next screen. The wizard is pretty self-explanatory so I’ll just call out a few things where you might wonder what the right choices are:

After a minute or two of this:
2015-02-21 14_32_53-Ansible - VMware Workstation

Choose a hostname for the VM. I chose “ansible”:
2015-02-21 14_33_34-Ansible - VMware Workstation

Since I’m lazy, I’ll go with “ansible” for the fullname and username as well:
2015-02-21 14_34_21-Ansible - VMware Workstation

After typing in your password twice, you’ll be asked to encrypt your home directory. Choose “No” on that one:
2015-02-21 14_36_41-Ansible - VMware Workstation

For disk partitioning, I go with:
2015-02-21 14_37_20-Ansible - VMware Workstation

Hit “Yes” to write the partition changes to disk:
2015-02-21 14_37_55-Ansible - VMware Workstation

And:
2015-02-21 14_38_37-Ansible - VMware Workstation

After some more “Next-ing”, you’ll get this screen. Select “OpenSSH Server”:
2015-02-21 14_41_43-Ansible - VMware Workstation

Select “Yes” to install the Grub boot loader:
2015-02-21 14_44_00-Ansible - VMware Workstation

After the install is done, you’ll get this screen. Hit Continue to eject the ISO and restart the VM:2015-02-21 14_44_40-Ansible - VMware Workstation

 

The VM is now ready for use. We’ll use putty from here, but first log on locally using the user and password you created earlier (my username is ansible)  and grab the IP address using the ifconfig command (I won’t go into setting a manually configured address in Ubuntu in this post):
2015-02-21 14_47_17-Ansible - VMware Workstation

Using that IP address, I can open putty and connect to the VM from my physical workstation:
2015-02-21 14_48_43-Add New Post ‹ Trond's Working! — WordPress

Note that you’ll have to hit “Yes” in the warning that putty gives you when it connects to a node for the first time. After that’s done, you can log on with your ansible user and password again, and all is good to go:
2015-02-21 14_50_11-Add New Post ‹ Trond's Working! — WordPress

 

Getting Ansible onto the VM:
Our next task is to install Ansible itself. There are a few options here, as you can install it as a package, or just clone Ansible’s github repo. We’ll use the last option, since it’s actually easier and we get to work with the newest code.

There are some prerequisites to satisfy first. Below are basically the commands that sets every thing up. I would advise you to paste them into your putty session one line at a time:

sudo apt-get install git -y
 sudo apt-get install python-setuptools -y
 sudo apt-get install python-dev -y
 sudo easy_install pip
 sudo pip install paramiko PyYAML jinja2 httplib2
With that out of the way, it’s time to clone Ansible from git:

cd ~
 git clone git://github.com/ansible/ansible.git --recursive
This will have the Ansible bits end up in a directory called ansible in your homedir.

Important: At the time of this writing, there is a bug in the newest ansible commits which causes some problems for WinRM communications. To get rid of these, we’ll re-wind the codebase to a slightly earlier commit:

cd /ansible
 git checkout 07dfbaedc30944857afc32cf2d3303d46b9cf3c9
We also need to add WinRM support:

sudo pip install http://github.com/diyan/pywinrm/archive/master.zip#egg=pywinrm
Since we’re running from source, everytime you start a session you need to run the following command (this adds the Ansible executables to your path):

cd ~
 source ansible/hacking/env-setup
At this point, Ansible is read for action.

Configuring Ansible:
The first thing we need is an inventory file. This inventory file provides information about which nodes Ansible should manage, and their IP addresses and so on. We’ll keep it simple in this demo. Note that Ansible is very flexible about where to put this file, but the default location is /etc/ansible/hosts, so we’ll just use that.

sudo bash
 mkdir /etc/ansible
 echo [windows]> /etc/ansible/hosts
 exit
This creates the /etc/ansible/hosts file, and adds an empty group called “windows”. Lets open that file up and add some more stuff using nano, an easy-to-use text editor:

sudo nano /etc/ansible/hosts
Edit the file so that it looks like this (the IP address is the address of the Windows VM I want to manage:):

2015-02-21 15_49_10-ansible@ansible_ ~

We now have an inventory file with one group (the group is named “windows”), and we’ve set a few variables for that group. Note that for the purpose of this demo I specify a clear-text password. That’s not a good idea, and there are several ways to avoid doing that. Hit Ctrl+x and then Y to save the file.

Getting the Windows node ready:
The Windows VM needs a little work before Ansible can talk to it: We need to enable WinRM over SSL (using port 5986), and enable basic authentication. Me and a few others wrote this script you can run (as admin) to get that set up automatically, and that script can be found here:
https://github.com/ansible/ansible/blob/devel/examples/scripts/ConfigureRemotingForAnsible.ps1.

Just paste the raw contents of that file into your ISE running as Admin and hit F5 (on your Windows VM, that is):

When that’s done, we can test Ansible with a simple ad-hoc command using the win_ping module:

ansible windows -m win_ping
If all works, this should return green text reading “success”, among some other info.

Playing with DSC:
Lets take Ansible’s newfound love for DSC out for a spin. I’ve created some samples which will configure our Windows vm with php, Mysql, and wordpress. In order to use it, we need to clone that repo, and install a few custom modules which are not part of Ansible (not yet, at least):

cd ~
 git clone https://github.com/trondhindenes/Ansible-win_dsc.git
 cd Ansible-win_dsc
 git checkout 832492bb8456f1fdfa5767a7481d2855ad853268
 cd ..
 mv Ansible-win_dsc win_dsc
(Note that I’m checking out a certain commit just so that if change something in the future, this guide is still going to work.)

Since these are custom modules, we need to tell Ansible about them. There are several ways to do this, but for this demo I’ll just copy them directly into Ansible’s module directories. The files are located in the directory win_dsc co we’ll just copy every file from there (excluding subdirectories):

sudo bash
 cp ~/win_dsc/* /home/ansible/ansible/v2/ansible/modules/core/windows
 cp ~/win_dsc/* /home/ansible/ansible/lib/ansible/modules/core/windows
 exit
At this point, we should be able to test the win_dsc5 module by simply running:
ansible windows -m win_dsc5

It will fail, since we didn’t specify any parameters, but that’s fine. The important thing is that Ansible found the module. The output should be something like:
2015-02-21 18_04_47-ansible@ansible_ ~

Playing with the PHP+MySQL+Wordpress demo:
Inside the ~/win_dsc/example_role I have created a fully working playbook for configuring a node. The Playbook uses the roles to break up the config into logical bits:
-Win_Common: Configure LCM and download some packages
-IIS_php: Configure IIS and PHP
-Win_Mysql: Configure Mysql
-Win_Wordpress: Configure a wordpress site inside IIS

In my demo I’m using an improved version of the win_feature module than ships with Ansible. The difference is that the improved one accepts a ton of windows features in comma-separated fashion so that you don’t have to write a statement for each feature you want to install. Using WinSCP it’s really easy to connect to the filesystem of the linux machine. Navigate to ansible/ansible/lib/ansible/modules/core/windows and edit the win_feature.ps1 file – basically replace the file contents with the new version which you can find here: https://gist.github.com/trondhindenes/f5a1bc15074e9d19e81a.

Back to our example. To kick off the entire thing all you have to do is:

ansible-playbook ~/win_dsc/example_role/site.yml -vv
(the v represents verbose logging. You can use from one to four v’s in order to specify the detailed-ness of logging you want.

Sit back and watch Ansible do its thing:
2015-02-21 18_14_29-ansible@ansible_ ~_win_dsc

In a few minutes, the VM should be up and running with a wordpress site ready to go at http://localhost/wordpress. It will take a little while on its first run, especially unpacking the wordpress file seems to be a bit slow due to the sheer number of files in that zip.

Next steps:
Obviously, you’re not gonna learn to much from the example above, but it should serve as a basic envornment for you to explorie Ansible. In order to learn more about Ansible, head over to http://docs.ansible.com.  There’s also a really great book on Ansible coming up, and the first 3 chapters can be downloaded for free by going here: http://www.ansible.com/ansible-book – highly recommended!

I would also encourage you to “read” the example configuration we just invoked. By looking at the main site.yml and corresponding roles you should be able to get an understanding of how everything ties together.

Happy configuring, and let me know in the comments if something didnt work!