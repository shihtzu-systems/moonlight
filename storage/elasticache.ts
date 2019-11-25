import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

export class ElasticacheCluster {
    name: string;
    clusterName: string;
    vpc: awsx.ec2.Vpc;

    securityGroup: awsx.ec2.SecurityGroup;
    subnetGroup: aws.elasticache.SubnetGroup;
    cluster: aws.elasticache.Cluster;

    constructor(name: string, clusterName: string, vpc: awsx.ec2.Vpc) {
        this.name = name;
        this.clusterName = clusterName;
        this.vpc = vpc;
    }

    apply() {
        this.securityGroup = new awsx.ec2.SecurityGroup(this.name, {
            vpc: this.vpc,
        });

        this.securityGroup.createIngressRule(this.name, {
            location: {
                cidrBlocks: [ this.vpc.vpc.cidrBlock ]
            },
            ports: new awsx.ec2.TcpPorts(6379),
            description: "allow internal redis traffic",
        });

        this.securityGroup.createEgressRule(this.name, {
            location: {
                cidrBlocks: [ "0.0.0.0/0" ]
            },
            ports: new awsx.ec2.AllTraffic(),
            description: "allow internet traffic",
        });

        this.subnetGroup = new aws.elasticache.SubnetGroup(this.name, {
            subnetIds: this.vpc.privateSubnetIds
        });

        const tags: aws.Tags = {};
        tags["Name"] = this.name;
        tags[`kubernetes.io/cluster/${this.clusterName}`] = "owned";

        this.cluster = new aws.elasticache.Cluster(this.name, {
            azMode: "single-az",
            clusterId: this.name,
            engine: "redis",
            engineVersion: "5.0.5",
            nodeType: "cache.t2.small",
            numCacheNodes: 1,
            securityGroupIds: [ this.securityGroup.id ],
            subnetGroupName: this.subnetGroup.name,
            tags: tags
        });
    }
}
