EC2_INSTANCE_TYPES = [
    't3.micro',
    't2.micro',
    't2.small',
    't2.medium',
    't2.large',
    'r4.large'
]

RDS_INSTANCE_TYPES = [
    'db.t2.micro',
    'db.t2.small',
    'db.t2.medium',
    'db.t2.large'
]

ELASTICACHE_INSTANCE_TYPES = [
    'cache.m1.small'
]

ALLOW_ALL_CIDR = '0.0.0.0/0'
VPC_CIDR = '10.0.0.0/16'

HTTP = 80
HTTPS = 443
POSTGRESQL = 5432
REDIS = 6379
SSH = 22

CANONICAL_ACCOUNT_ID = '099720109477'

AMAZON_S3_HOSTED_ZONE_ID = 'Z3AQBSTGFYJSTF'

AMAZON_S3_WEBSITE_DOMAIN = 's3-website-us-east-1.amazonaws.com'
