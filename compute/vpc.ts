import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

export function applyVpc(name: string, cidrBlock: string): awsx.ec2.Vpc {

    const vpcTags: aws.Tags = {};
    vpcTags["Name"] = name;
    vpcTags[`kubernetes.io/cluster/${name}`] = "owned";

    const privateSubnetTags: aws.Tags = {};
    privateSubnetTags[`kubernetes.io/cluster/${name}`] = "owned";
    privateSubnetTags["kubernetes.io/role/internal-elb"] = "1";

    const publicSubnetTags: aws.Tags = {};
    publicSubnetTags[`kubernetes.io/cluster/${name}`] = "owned";
    publicSubnetTags["kubernetes.io/role/elb"] = "1";

    return new awsx.ec2.Vpc(name, {
        cidrBlock: cidrBlock,
        subnets: [
            {
                type: "private",
                tags: privateSubnetTags,
                assignIpv6AddressOnCreation: false,
            },
            {
                type: "public",
                tags: publicSubnetTags,
                assignIpv6AddressOnCreation: false,
            }
        ],
        numberOfAvailabilityZones: 2,
        numberOfNatGateways: 1,
        tags: vpcTags
    });
}
