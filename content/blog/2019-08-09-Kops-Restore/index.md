---
title: Restoring a failed Kops-managed Kubernetes cluster
date: "2019-08-09"
---

### TLDR
If your kops-managed Kubernetes cluster is in shambles, this blog post is for you.

### Why did I write this post?
As much as we like kops for managing our clusters, it can be a bit brittle and when looking for info, documentation is often hard to find. Lots of github issues with similar problems to what we're seeing is simply "auto-closed" without being resolved. It's definetely something to be aware of when using kops: You're mostly on your own.

We had a massive outage in 2 non-prod cluster, both due to the fact that we'd scaled our masters to small, and when the "nodes" instance group started scaling out to more than 8-10 nodes, the masters could't cope anymore. In theory, this should be as simple as updateing the a setting in kops and perform a rolling update. However, when we did that we noticed that the new master didn't properly join the cluster.

This again all boiled down to kube-apiserver not being able to reach etcd. Etcd is managed by a component called "etcd-manager" (logically enough) which is supposed to set up the etcd clusters correctly. This mostly works super-well. As far as I understand, etcd-manager uses ebs volumes attached to the node to identify it. So each master gets a few ebs volumes which are tagged "master-1, master-2, master-3" and so on, but in our case we saw that multiple masters got similarly tagged volumes leading to etcd cert name issues, which again caused kube-apiserver to fail. 

In any case. Whatever issue you're having with kops and your masters, I hereby present to you, the "kubernetes master get out of jail free card" aka "a well-tested restore process". Please let me know if it doesnt work for you or it needs more details (submit issues/PRs here: <https://github.com/trondhindenes/trondsworking-blog-gatsby>).

### Overall restore process
Here's what you'll do:
1. Wipe your current (failed) masters
2. Let kops recreate masters
3. Restore data

It is assumed that you run kops on AWS, and that the "kops state store" s3 bucket has at least one good backup you can use to restore.

### Wipe masters
NOTE: Once you do this, there's no turning back. Your cluster will be unavailable during the rest of the process. Depending on your choice of ingress/load balancer setup, services running on your cluster may be down.

Perform deleting by simply deleting the 3 "master" autoscaling groups in AWS. Once the master instances are wiped, make sure any EBS volumes are also deleted. There are most likely volumes named `x.etc.y.<cluster name>`. Just get rid of them. Any volume named `something something master <cluster name>` should be deleted

### Let kops create new masters
use `kops update` to converge the cluster. Kops will determine that masters are missing, and provision them. If you want to change instance type for your masters, make the change _before_ running kops update so you don't have to perform a rolling update later.

### Perform the restore
This is the tricky bit.
1. ssh into each master. Wait until all 3 masters have 2 containers called something related to "etcd". There should be one "etcd-main" and one "etcd-evets" container. There will be 2 "pause" containers aswell, you can disregard these. etcd-main and etcd-events represent 2 separate etcd clusters that run on the master node. We'll restore each in turn.Lets do etcd-main first
2. Find out which of the masters run an etcd-main container which is currently cluster leader. It will have output along the lines of "restore needs to be performed". The non-leader containers will simply write "not leader" or similar over and over.
3. Exec into the "leader" container using docker exec
Run the following (it installs the etcd-manager-ctl binary):
```bash
#NOTE if using a different etcd-manager version, adjust the download link accordingly. It should matche the version of the /etcd-manager in the same container
apt-get update && apt-get install -y wget
wget https://github.com/kopeio/etcd-manager/releases/download/3.0.20190801/etcd-manager-ctl-linux-amd64
mv etcd-manager-ctl-linux-amd64 etcd-manager-ctl
chmod +x etcd-manager-ctl
mv etcd-manager-ctl /usr/local/bin/
```
4. Still in the container, run `etcd-manager-ctl -backup-store=s3://<kops s3 bucket name>/<cluster full name>/backups/etcd/main list-backups`, for example:
`etcd-manager-ctl -backup-store=s3://superkopsbucket/supercluster.k8s.local/backups/etcd/main list-backups`

5. Restore the latest backup in the list, or the one containing the timestamp you want to restore to (this will bring the entire cluster back to this point in time):
`etcd-manager-ctl -backup-store=s3://<bucket>/<cluster full name>/backups/etcd/main restore-backup 2019-08-09T06:38:52Z-000001`

6. Immediately afterwards, exit out of the container. Kill the 3 containers (one on each node) running etcd-main. Kubelet will restart them, and after a few seconds they should come up again and start syncing
7. do the exact same sequence of steps for the "etcd-events" container. Backups will be stored in an s3 path ending with "backups/etcd/events" instead of "backups/etcd/main", otherwise the steps are exactly the same.
8. After both etcd clusters are back online, its time to bring kube-apiserver online. Kube-apiserver is probably in a state of CrashLoop at this point, so the easiest way to do that is simply to restart the kubelet service on each node.
10. Tail the output of "/var/logs/kube-apiserver.log" to see that it's online. It can take a few minutes after the etcd restore. If kube-apiserver quits, try restarting the kubelet service again.
11. At this point, you should be able to reach the cluster using kubectl from your own computer.

### Cleanup
Delete any non-existing nodes. There are probably 3 non-existing master nodes.

That's it! We're using the Traeik ingress controller, and since Traefik will hang on to its last known config in the case of apiserver issues, we actually stay online thru the entire process. Test first in non-prod!
