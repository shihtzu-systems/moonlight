import * as pulumi from "@pulumi/pulumi";

import * as vpc from "./compute/vpc";
import { AlbIngressController } from "./network/alb";
import { EksCluster } from "./cluster/eks";
import { ClusterRole } from "./permissions/iam";
import { ExternalDns } from "./network/externaldns";
import { TraefikOperator } from "./observe/traefik";
import { JaegerInstance, JaegerOperator } from "./observe/jaeger";
import { Bright, BrightCache } from "./shihtzu/bright";

const config = new pulumi.Config();
const name = config.require("name");
const vpcCidrBlock = config.require("vpcCidrBlock");
const awsAccountId = config.require("awsAccountId");
const traefikBasicAuth = config.require("traefikBasicAuth");

const clusterVpc = vpc.applyVpc(name, vpcCidrBlock);

const clusterRole = new ClusterRole(name);
clusterRole.apply();
clusterRole.attach("eks-worker", "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy");
clusterRole.attach("eks-cni", "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy");
clusterRole.attach("ecr-ro", "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly");

const externalDns = new ExternalDns("default", "external-dns");
externalDns.applyIamPolicy();
clusterRole.attach(externalDns.name, `arn:aws:iam::${awsAccountId}:policy/${externalDns.name}`);

const albIngressController = new AlbIngressController("default","alb-ingress-controller", name);
albIngressController.applyIamPolicy();
clusterRole.attach(albIngressController.name, `arn:aws:iam::${awsAccountId}:policy/${albIngressController.name}`);

const eksCluster = new EksCluster(name, clusterRole.role, clusterVpc);
const kubernetesProvider = eksCluster.apply();

// External DNS
externalDns.apply(kubernetesProvider);

// ALB Ingress Controller
albIngressController.apply(kubernetesProvider);

// Traefik Operator
const traefikOperator = new TraefikOperator(
    "default",
    "traefik-operator",
    "traefik.shihtzu.io",
    "jaeger-agent");
traefikOperator.apply(kubernetesProvider);
// proxy ALB to Traefik
albIngressController.applyIngressProxy(traefikOperator.service, kubernetesProvider);

// Jaeger Operator
const jaegerOperator = new JaegerOperator(
    "default",
    "jaeger-operator"
);
jaegerOperator.apply(kubernetesProvider);

// Jaeger Instance
const jaegerInstance = new JaegerInstance(
    "default",
    "jaeger",
    "jaeger.shihtzu.io"
);
jaegerInstance.apply(kubernetesProvider);

// bright
const brightConfigYaml = config.require("brightConfigYaml");
const brightImage = config.require("brightImage");
const brightVersion = config.require("brightVersion");
const brightDatestamp = config.require("brightDatestamp");
const brightTimestamp = config.require("brightTimestamp");
const brightImageTag = `${brightVersion}-on.${brightDatestamp}.at.${brightTimestamp}`;

const brightCache = new BrightCache("default", "bright-cache");
brightCache.apply(kubernetesProvider);

const bright = new Bright(
    "default",
    "bright",
    brightImage,
    brightImageTag,
    "bright.shihtzu.io",
    brightConfigYaml);
bright.apply(brightCache.service, kubernetesProvider);
