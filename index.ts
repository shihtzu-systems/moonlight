import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";
import { AlbIngressController } from "./network/alb";
import { ClusterRole } from "./permissions/iam";
import { ExternalDns } from "./network/externaldns";
import { TraefikOperator } from "./observe/traefik";
import { JaegerInstance, JaegerOperator } from "./observe/jaeger";
import { Bright, BrightCache } from "./shihtzu/bright";
import { Bingo } from "./shihtzu/bingo";
import { Oompa, OompaData } from "./learn/oompa";
import {Hotrod} from "./learn/hotrod";

const config = new pulumi.Config();
const name = config.require("name");
const awsAccountId = config.require("awsAccountId");

const clusterRole = new ClusterRole(name);
clusterRole.apply();

const externalDns = new ExternalDns("default", "external-dns");
externalDns.applyIamPolicy();
clusterRole.attach(externalDns.name, `arn:aws:iam::${awsAccountId}:policy/${externalDns.name}`);

const albIngressController = new AlbIngressController("default","alb-ingress-controller", name);
albIngressController.applyIamPolicy();
clusterRole.attach(albIngressController.name, `arn:aws:iam::${awsAccountId}:policy/${albIngressController.name}`);

const kubernetesProvider = new kubernetes.Provider("local", {});

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

// bright - main
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

// bright - live
const liveBrightConfigYaml = config.require("liveBrightConfigYaml");
const liveBrightImage = config.require("liveBrightImage");
const liveBrightVersion = config.require("liveBrightVersion");
const liveBrightDatestamp = config.require("liveBrightDatestamp");
const liveBrightTimestamp = config.require("liveBrightTimestamp");
const liveBrightImageTag = `${liveBrightVersion}-on.${liveBrightDatestamp}.at.${liveBrightTimestamp}`;

const liveBright = new Bright(
    "default",
    "live-bright",
    liveBrightImage,
    liveBrightImageTag,
    "bright.pub",
    liveBrightConfigYaml);
liveBright.apply(brightCache.service, kubernetesProvider);

// bingo
const bingoConfigYaml = config.require("bingoConfigYaml");
const bingoImage = config.require("bingoImage");
const bingoVersion = config.require("bingoVersion");
const bingoDatestamp = config.require("bingoDatestamp");
const bingoTimestamp = config.require("bingoTimestamp");
const bingoImageTag = `${bingoVersion}-on.${bingoDatestamp}.at.${bingoTimestamp}`;

const bingoCache = new BrightCache("default", "bingo-cache");
bingoCache.apply(kubernetesProvider);

const bingo = new Bingo(
    "default",
    "bingo",
    bingoImage,
    bingoImageTag,
    "bingo.shihtzu.io",
    bingoConfigYaml);
bingo.apply(bingoCache.service, kubernetesProvider);


// learn - hotrod
const hotrod = new Hotrod(
    "default",
    "hotrod",
    "hotrod.shihtzu.io",[
        "--jaeger-agent.host-port=http://jaeger-collector:14268/api/traces",
        // Average lagency of MySQL DB query
        // "--fix-db-query-delay=100ms",
        // Disables the mutex guarding db connection
        // "--fix-disable-db-conn-mutex",
        // Default worker pool size
        // "--fix-route-worker-pool-size=100",
        "all",
    ]);
hotrod.apply(kubernetesProvider);


// learn - oompa
const oompaImage = config.require("oompaImage");
const oompaVersion = config.require("oompaVersion");
const oompaDatestamp = config.require("oompaDatestamp");
const oompaTimestamp = config.require("oompaTimestamp");
const oompaImageTag = `${oompaVersion}-on.${oompaDatestamp}.at.${oompaTimestamp}`;

const oompa = new Oompa(
    "default",
    "oompa",
    oompaImage,
    oompaImageTag,
    "oompa.shihtzu.io");
oompa.apply(kubernetesProvider);

const oompaData = new OompaData(
    "default",
    "oompa-data");
oompaData.apply(kubernetesProvider);
