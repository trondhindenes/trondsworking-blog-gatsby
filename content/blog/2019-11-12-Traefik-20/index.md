---
title: Migrating to Traefik 2.0 without downtime
date: "2019-11-12"
description: How we migrated to Traefik 2.0 with IngressRoute CRDs.
---

We've been using Traefik as the Ingress Controller of choice ever since we started using Kubernetes. We also use Traefik for our non-containerized apps, where Consul is used as the "source of truth" for routing configuration.

Traefik 2.0 has a few very nice enhancements over 1.0, with so-called "Middlewares" <https://docs.traefik.io/middlewares/overview/> being the killer feature for us. Using custom CRDs instead of the "classical" Kubernetes Ingress also allows more flexible routing rule composition, which we in turn can pass down to our dev teams in order to give them more control of how traffic is sent to services.


## The "before" state (Traefik 1.0)
As part of our (kops-based) Kubernetes node provisioning setup, we deployed 4 traefik 1.0 pods to all "worker" nodes in all clusters. 2 pods for external and 2 pods for internal, separating between http and https-based traffic (the actual https terminatin is handled by AWS ALBs running in front of our clusters).

We use node ports (not `nodePort`) to map ALB traffic to corresponding ports on Kubernets nodes, where Traefik takes over and routes traffic to the correct pods, based on Ingress objects. (In case you were wondering, we don't use the `LoadBalancer` service type in Kubernetes for this, the "Ingress ALB" is defined in cloudformation per cluster)

The upgrade is split up into several steps, described below. For each cluster we would run thru each step in order.

## Transition part 1
Part one of the transition was simply to add the Traefik 2.0 CRD definitions to the cluster so that IngressRoute objects could be created. Each cluster has a "janitor" container which sets some cluster metadata based on various cluster characteristics. We added a new metadata attribute to indicate whether or not the cluster supports Traefik 2.0 CRDs. We store this "cluster metadata" in Rancher, and it looks something like this when querying the Rancher api:
```json
{
"annotations": {
    "lifecycle.cattle.io/create.cluster-agent-controller-cleanup": "true",
    "lifecycle.cattle.io/create.cluster-provisioner-controller": "true",
    "lifecycle.cattle.io/create.cluster-scoped-gc": "true",
    "lifecycle.cattle.io/create.mgmt-cluster-rbac-remove": "true",
    "provisioner.cattle.io/ke-driver-update": "updated",
    "rikstv.no/alb-mappings.external": "whatwhat.eu-west-1.elb.amazonaws.com",
    "rikstv.no/jaeger-endpoint": "monitoring-jaeger-agent.rikstv-system",
    "rikstv.no/use_ingress_routes": "true"
    }
}
```
This means that we can use the Rancher api to query for information we need during deploys or similar.

## Transition part 2
After all CRDs were in place, we needed to create IngressRoute rules corresponding to all existing Ingress objects. We built some tooling that allowed us to "scan" an entire cluster, compare Ingress vs IngressRoute objects, and print a list of missing/misconfigured IngressRoute objects. Since we generate Kubernetes manifests dynamically during deploy, we could simply add some logic for creating both Ingress and IngressRoute objects. Something like "if the cluster supports IngressRoute objects, create both Ingress and IngressRoute". 
After all services were redeployed (to create the missing objects), we could run a new scan to verify that all IngressRoute objects were in place. At this point the cluster was ready for the transition to Traefik 2.0.

## Transition cutover
The next piece of the puzzle was to simply apply the Traefik 2.0 daemonset to the cluster. We use Ansible to apply a bunch of per-cluster manifests, so Traefik 2.0 is in fact an Ansible role, separate from the Traefik 1.0 role. We have a "vars file" per cluster, which controls whether or not the cluster should run Traefik 1.0 and/or 2.0:
```yaml
install_traefik_1: no
install_traefik_2: yes
traefik20_docker_image_version: v2.0.4
```
so, by deploying traefik 2.0 onto a cluster already running 1.0 nothing would actually happen, because the host ports needed by the Traefik 2.0 pods were already in use by the Traefik 1.0 pods. This allowed us to apply the new Daemonset without any risk.
The next step would be to stop running Traefik 1.0 from a single node. This was performed by adding an affinity rule to the Traefik 1.0 daemonset:
```yaml
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/hostname
                operator: NotIn
                values: worker-1
```
This would cause a single node to get rid of its Traefik 1.0 pods and spin up Traefik 2.0 pods instead. By using a combination of ALB health checks and Traefik's `gracetimeout` setting, the node wouldn't get traffic while it replaced its pods.

At this point we had switched to IngressRoute CRDs on a single node, while still using regular Ingress objects on the rest. We would then delete the Traefik 1.0 daemonset. This is the most critical point of the cutover, as all traffic into the cluster is handled by a single node. Since this only lasts a few seconds, we decided we could live with the risk.

After the Traefik 1.0 daemonset was deleted, all pending Traefik 2.0 pods would pop up, since the required node ports were now freed up.


## Cleanup
Because of some weird thing with Daemonsets, it turns out that Daemonset pods which have been in a "pending" state don't properly perform a rolling update if needed. Because of this, we would manually delete all Traefik 2.0 pods (one by one) and let the cluster spin up new ones. These "gen-2" pods seem to behave properly during subsequent rolling upgrades.

## Bottom line
All in all this wasn't too difficult. To sum up:
- Make sure your daemonsets are properly configured to perform rolling deployments
- Use Traefik's `gracetimeout` to give load balancer health probes enough time to stop sending traffic to the node in question before Traefik itself terminates
- Use affinity rules to upgrade from 1.0 to 2.0 with full controll of the process.

