---
title: Retaining my enthusiasm for tech through bad days at work
date: "2016-05-05"
description: Retaining my enthusiasm for tech through bad days at work
---

**Please note: This post has been copied from my archive, and probably misses formatting and pictures**

Wow, that was a screwed-up 6 months. I started a new job, my first CxO position. And realized after two weeks that the CEO was a sociopath. I managed to hang in there for 2 long months until I said “enough” gave my notice, and stayed on for another 2 long (looooong) months to make sure my customers didn’t get stuck with half-finished projects. All in all, it’s been a large dip in my (so far) otherwise interesting and fun career.

I noticed stuff happening as my motivation reached lower and lower levels: I started to not care about the things I like to do. I stopped paying attention to news around Azure and PowerShell and Ansible. I had to let summit organizers know that I was going thru a rough patch and wasn’t able to present (which every single one accepted without giving me shit, which I am very thankful for). I was kind of going downhill in my love for tech.

Until I realized something: I can do fun tech-related stuff OUTSIDE of work. In other words, I realized I needed a hobby that didn’t involve snowboards and mountains. I decided to take up drones. The rest of this blog post is what I’ve done and what I’ve learned the last 6 months, and let me warn you: It’s all pretty far from Azure and PowerShell.

So, why Drones? I’ve dabbled in RC on and off as long as I can remember. I even bought a Phantom 2 drone a couple of years back, to goof around filming aerial shots. I quickly realized that filling my backpack with all the gear necessary to shoot my friends skiing or snowboarding from the air wasn’t going to happen as much as I hoped it would, so when Squadrone systems released their autonomous drone, the Hexo+, I ordered one straight away. This was a drone MADE for the outdoors and for snowboarding. I didn’t even need to shoot my friends, I could have it film myself as I rode down my favorite mountains here in the mountaineous northwest of Norway.

Or so I hoped.

Turned out, the Hexo+ sucked (still does, last time I checked). It uses the “operator’s” cell phone GPS for tracking, and we all know how imprecise those units are. The system operates at 1Hz (one update per second), and let me tell you: Lots of stuff can happen in one second when your crusing down a mountain on a snowboard. All in all, the thing sucked. Which led me to believe that I could build something better myself. And research started.

Modern drones are controlled by a flight controller, basically a small onboard computer which has tons of sensors and smarts to figure out what the motors need to do when you push the stick on your RC transmitter forward. The flight controller levels out the drone, makes sure it stays at the right altitude and a truckload of other things. As I researched, I kept coming back to a flight controller unit called PixHawk, and that one appealed to me because of its ability to run different flight controller operating systems, both of which are open-source. As I kept digging further I figured out that it’s even possible for a small Linux computer (such as the Raspberry Pi) to run the controller operating systems, and that it’s possible to communicate with it using different options (both cabled and wireless). I even visisted a drone company in Oslo, Norway who are building some cutting-edge stuff based on these controlles. Much fun.

So, I went to town on a couple of chinese online stores and ordeded about 8000 pieces of small items I didn’t exactly knew what was, but I figured I’d need in order to build what I thought of as a “research platform” (which really was a butt-ugly hexacopter with a Pixhawk unit, a Raspberry Pi and all the dangling wires that come with it).





I decided to go with the flight controller operating system called ArduPilot since I’d heard of it before, and because there’s a corresponding Python SDK that goes with it. By the way, I didn’t know Python at the time. Good time to learn.

I also figured I needed some kind of “ground station” with a precice GPS so I bought a USB-based GPS receiver with a lot higher precision and speed than a regular smartphone GPS. I spent 2 days looking for how to get my Android phone to use that as a source instead of the builting GPS, and it turned out I needed to write that myself. By the way, Android apps are written in Java. I didn’t know Java. Good time to learn. 4 days after I started Android Studio (the Android IDE) for the first time, I had successfully integrated a USB driver I found in some obscure GitHub repo into my own app, and was able to replace the phones GPS function with my USB unit’s high-precision GPS signal . I was amazed at how similar Java actually is to C# (and to PowerShell in some extent). Very strongly typed, very object-oriented, very well documented on the internets. My app didn’t perform as well as I wanted (we’re talking a bunch of updates per second), so I had to learn about multithreading in Java, which came to good use later in my endeavour.

Just for the fun of it I found a YouTube video on how to reverse-engineer apps, so I also managed to crack open the Hexo+ app and force it to use my high-precision GPS signal instead of the phone’s. There’s actually a YouTube video describing how to reverse-engineer an android app from start to finish, made by an extremely soft-spoken dude in India. People are awesome.

Back to my main task: To send my phone’s GPS position to my “research drone” so that it would follow me smoothly. I banged my head against the Linux Bluetooth stack and measured performance diffs between http and raw tcp. I wrote a heavily multithreaded Python app to serve as the “command center” which would receive signals from my phone and decide where to fly the drone. I learned about Python queues and TwistedMatrix, an amazing project for writing networked applications in Python. Oh, and I learned Python. Turns out it’s not so hard, although I personally prefer to work in a more strongly typed environment. The Python community is awesome tho, and I was learning so much that I felt I was a new person at the end of every day.

I had to dig up on math skills learnt and forgotten long ago. Stuff like “how do you calculate the distance in meters between two GPS coordinates?”. What’s a covariant? Again, the community is awesome and without it I would have gotten seriously stuck in problems calculating headings and offsets and other things my math teacher in High School would have loved.

And I had to learn about drone hardware. About ESCs and power ratings and motors and prop thrust and prop wash and thousand other things. I (re)-learned how to solder properly. I even had to teach myself how to crimp a PicoBlade connector, which required a magnifying glass and more patience than I thought I had in me.

And in the end, it flew. It flew beatifully. Or, not beautifully but at least it flew. I needed to come up with a way to smooth out the flight commands which my python app sent to the PixHawk flight controller. I discovered a whole simulation framework which enabled me to test new ideas without crashing my precious drones (yep, they multiplied. Don’t know how that happened). I figured I could use Windows 10’s new “Bash on Windows” to run the Linux parts of the simulation stack to avoid having to spin up a VM whenever I wanted to tweak something, which shot my productivity thru the roof. I even created a youtube video about that, for which Erle Robotics in spain sent me their own custom RaspBerry Pi-based flight controller system just because they thought it was cool. Like I said, the community rocks.



I learned more about python and class-level properties versus instance-level properties. I even started enjoying just flying drones again, so I bought this crazy small/cheap FPV racing drone which I could (and did!) crash without it costing me more than my car is worth.

I got word that some Norwegian drone company had “heard of my work in the autopilot space”, whatever that means. I mean, I was just goofing around trying to cancel out the insanity that was my day job.

And I built a website with more ugly jQuery code behind it than I ever thought possible to put inside a single JavaScript file. But it works. It works beatifully.

I can use that webpage on my phone to take off my Drone, to have it follow me and all of that is because of code I wrote. In Java. In Python. In Javascript.

Next week it’s time to realize that I’ll soon have a day job again. It’s a good company. I’ll get to work with Azure and AWS and automation and all the things I love. However, the value of a pet project to keep me busy thru the last months have meant so much to me. My buddies have even started buying drones because I couldn’t shut up about how much fun I was having. I’ve spent late nights and early mornings in fron of the computer, not because I got paid but because I just couldn’t not. It was too much fun. And I’ve got the opportunity to dip my toes in a vast range of technologies and programming languages, and I’ve realized they all have their strengths and weaknesses. I used to look down on Java devs. I don’t anymore, it’s a kick-ass language. Python rocks as well. As does JavaScript although my skill level there is mostly cut-paste-chrome-debug.

Money has been tight, and will be even tighter before it gets better. Still, I wouldn’t want to trade the last month’s whirlwind of technology learning with anything.

And if you think your VM deployment script is exciting, try writing code that makes things actually fly by themselves.

Now I’m looking forward to getting back on the horse, and to chatting with all my friends on the Azure/PowerShell community. And to get paid.