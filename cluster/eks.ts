import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as awsx from "@pulumi/awsx";
import * as kubernetes from "@pulumi/kubernetes";

export class EksCluster {
    name: string;
    vpc: awsx.ec2.Vpc;
    role: aws.iam.Role;

    eks: eks.Cluster;

    constructor(name: string, role: aws.iam.Role, vpc: awsx.ec2.Vpc) {
        this.name = name;
        this.vpc = vpc;
        this.role = role;
    }

    apply(): kubernetes.Provider {
        this.eks = new eks.Cluster(this.name, {
            vpcId: this.vpc.id,
            subnetIds: this.vpc.privateSubnetIds,
            nodeAssociatePublicIpAddress: false,
            deployDashboard: false,
            instanceRole: this.role
        });
        return this.eks.provider
    }
}
