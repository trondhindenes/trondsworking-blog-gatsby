---
title: Exploring Kubernetes Liveness- and Readiness-probes
description: 'Code and things: https://github.com/trondhindenes/K8sProbeTester'
date: '2018-09-08T12:03:35.304Z'
categories: []
keywords: []
slug: >-
  /@trondhindenes/exploring-kubernetes-liveness-and-readiness-probes-e9bbc7d899be
---

_Code and things:_ [_https://github.com/trondhindenes/K8sProbeTester_](https://github.com/trondhindenes/K8sProbeTester)

A while back, one of our devs noticed that one of their rest apis were down for a few seconds during deployment, although we felt we had tweaked the deployment manifest and added probes and delays and what not. This led to some back-and-forth, and I never had time to properly sit down and figure stuff out. Until now. Together with my two best friends (coffee and quiet), I decided to sit down and figure out how how these things really work in the exciting but relatively complex world of Kubernetes.

As always, I try and approach a problem by setting up an environment that allows me to iterate as quickly as possible around a problem. The first thing I did was to create a super-simple Docker image with a health endpoint that I can probe from Kubernetes, and add an optional `START_WAIT_SECS` environment variable that I can use to simulate a slow-starting app. Here’s the bare minimum kubernetes manifest I started out with:

```
---  
kind: Deployment  
apiVersion: extensions/v1beta1  
metadata:  
  name: k8sprobetester-v1  
  namespace: default  
  labels:  
    app: k8sprobetester  
spec:  
  replicas: 3  
  selector:  
    matchLabels:  
      app: k8sprobetester  
  template:  
    metadata:  
      labels:  
        app: k8sprobetester  
    spec:  
      containers:  
      - image: "trondhindenes/k8sprobetester:latest"  
        name: k8sprobetester  
        env:  
          - name: START_WAIT_SECS  
            value: '0'
```

As you’ll notice this is about as simple as it gets, no fancyness of any kind. I’m using my local minikube instance, which means that if I add a service definition, minikube can give me a reachable url:

```
---  
apiVersion: v1  
kind: Service  
metadata:  
  name: k8sprobetester  
  namespace: default  
spec:  
  selector:  
    app: k8sprobetester  
  type: NodePort  
  ports:  
  - name: http  
    port: 80  
    targetPort: 80
```

running `minikube service k8sprobetester` I get a url back that I can use to test it (your port will likely be different): [http://192.168.99.100:32500/healthz](http://192.168.99.100:32500/healthz).

No we have a lab to test things. I’m also setting the `START_WAIT_SECS` to 15 to simulate a slow-starting app. We also need something to make Kubernetes believe a change needs to be invoked, so I’m adding a second random environment variable that I just keep changing the value of.

At this point you can view the rollout from one “version” to the next with the following commands (it’s a good idea to have 4 consoles up, one for each of these:

```
watch kubectl rollout status deployment k8sprobetester-v1  
watch kubectl get pods  
watch curl [http://192.168.99.100:32500/healthz](http://192.168.99.100:32500/healthz)
```

and one for invoking commands like `kubectl apply.`

In this version of the deployment, there’s no probing going on, and altho we have 3 replicas of our pod, there’s nothing telling Kubernetes that it shouldn’t tear down all of them at the same time when deploying a new version. This coupled with the wait time will cause our app to be down for 5–10 seconds during the deployment. We don’t want that.

The first thing we can do, is to tell Kubernetes something about how it should go about deploying our app. We can do that with a “deployment strategy”, which could look something like this:

```
---  
kind: Deployment  
apiVersion: extensions/v1beta1  
metadata:  
  name: k8sprobetester-v1  
  namespace: default  
  labels:  
    app: k8sprobetester  
spec:  
  replicas: 3  
  selector:  
    matchLabels:  
      app: k8sprobetester  
  strategy:  
    type: RollingUpdate  
    rollingUpdate:  
      maxUnavailable: 10%  
  template:  
    metadata:  
      labels:  
        app: k8sprobetester  
    spec:  
      containers:  
      - image: "trondhindenes/k8sprobetester:latest"  
        name: k8sprobetester  
        env:  
          - name: START_WAIT_SECS  
            value: '15'  
          - name: SOME_OTHER_VAR  
            value: yasssd
```

Here’s we’re specifying that during a rolling update, max 10% of our resources should be unavailable. Kubernetes has some builtin smarts that figures out what 10% means in terms of number of pods. Problem now is that even removing one of our pods would dip us below 10%, so the deployment simply won’t be able to start. Lets adjust it to 40%, wich allows a single pod to be down (you can also use regular numbers instead of percentages, and the default is “1”, according to the kubernetes reference doc).

In itself, this doesn’t matter too much for our deployment, because Kubernetes doesn’t have a way to know if the pod actually started, so it assumes that once the pod reaches the “Running” state, all is good. That’s of course not the case with our slow-starting containers. So, we need something to inform it, and for that we can use probes. Probes come in different shapes and forms, but since we’re playing with a rest api here, we’re using the “http” probe type.

Here is the deployment with a LivenessProbe added. Notice that I’ve set the initialDelaySeconds setting to 20, since we know that our app is using 15 seconds to start:

```
---  
kind: Deployment  
apiVersion: extensions/v1beta1  
metadata:  
  name: k8sprobetester-v1  
  namespace: default  
  labels:  
    app: k8sprobetester  
spec:  
  replicas: 3  
  selector:  
    matchLabels:  
      app: k8sprobetester  
  strategy:  
    type: RollingUpdate  
    rollingUpdate:  
      maxUnavailable: 40%  
  template:  
    metadata:  
      labels:  
        app: k8sprobetester  
    spec:  
      containers:  
      - image: "trondhindenes/k8sprobetester:latest"  
        name: k8sprobetester  
        env:  
          - name: START_WAIT_SECS  
            value: '15'  
          - name: SOME_OTHER_VAR  
            value: yasss  
        livenessProbe:  
          httpGet:  
            path: /healthz  
            port: 80  
            httpHeaders:  
              - name: Host  
                value: KubernetesLivenessProbe  
          initialDelaySeconds: 20
```

This is about the same configuration we were running when the developer came to me with a WTF on his face. How come Kubernetes tears down the running pods before the first one has started? The answer is: We need another type of probe: _readinessProbe._ It turns out that Kubernetes has two separate ways to track the health of a pod, one during deployment, and one after. LivenessProbe is what causes Kubernetes to replace a failed pod with a new one, but it has absolutely no effect during deployment of the app. Readiness probes, on the other hand, are what Kubernetes uses to determine whether the pod started successfully. Let’s add one, with the same settings as the live nessprobe:

Doing a new deployment now, you should see that the “READY” column is taking a while before reaching “1”, meaning that altho the pod has started, Kubernetes isn’t considering the pod ready just yet:

![](https://cdn-images-1.medium.com/max/800/1*8hqzZjOSi564TmdpHxA6rA.png)

At this point, you should be able to continuously hit the service during deployment and never get any errors.

But how about tracking actual failures during startup? Lets see how Kubernetes deals with that. I’ve added another flag to my image that allows me to crash the pod in a certain percentage of instantiations (if you look at the code it isn’t super-exact, but it’s good enough).

The new deployment looks like this:

```
---  
kind: Deployment  
apiVersion: extensions/v1beta1  
metadata:  
  name: k8sprobetester-v1  
  namespace: default  
  labels:  
    app: k8sprobetester  
spec:  
  replicas: 5  
  selector:  
    matchLabels:  
      app: k8sprobetester  
  strategy:  
    type: RollingUpdate  
    rollingUpdate:  
      maxUnavailable: 30%  
  template:  
    metadata:  
      labels:  
        app: k8sprobetester  
    spec:  
      containers:  
      - image: "trondhindenes/k8sprobetester:latest"  
        name: k8sprobetester  
        env:  
          - name: START_WAIT_SECS  
            value: '15'  
          - name: CRASH_FACTOR  
            value: '30'  
          - name: SOME_OTHER_VAR  
            value: yassf  
        livenessProbe:  
          httpGet:  
            path: /healthz  
            port: 80  
            httpHeaders:  
              - name: Host  
                value: KubernetesLivenessProbe  
          initialDelaySeconds: 20  
        readinessProbe:  
          httpGet:  
            path: /healthz  
            port: 80  
            httpHeaders:  
              - name: Host  
                value: KubernetesLivenessProbe  
          initialDelaySeconds: 20
```

As you can see, we’ve set the crash factor to 30 (meaning, about 30% of the time the app will crash during startup) and also scaled up the number of replicas to 5.

When deploying this you should see Kubernetes noticing some of the pods crashing, and keeping retrying until all 5 of them are in a “READY” state, which could take a few minutes. You should also see that our “ping” against the “healthz” url never actually went down, so we survived multiple app failures during deployment.

On a closing note: Getting these things rightis never easy, and it likely takes tweaking on a service-by-service basis with Kubernetes “owners” and the app/service owners working together. There’s also much to tweak around how fast to start polling (for example, you could start probing sooner but instead add some failure tolerance) and other settings, but thanks to the awesome Kubernetes api documentation all of that stuff is there for you to peruse.

For us at RiksTV it’s been a year of intense learning as we’ve started to put actual customer-facing services on Kubernetes, and something tells me we have a loong way to go.

I encourage you to dive deeper into the options Kubernetes provides around deployments, and the reference documentation for the DeploymentSpec type is a very good place to start: [https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.11/#deploymentspec-v1-apps](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.11/#deploymentspec-v1-apps)

May your deploys never fail, and your probes protect you.