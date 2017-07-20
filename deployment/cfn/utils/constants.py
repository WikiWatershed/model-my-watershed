EC2_INSTANCE_TYPES = [
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

GRAPHITE = 2003
GRAPHITE_WEB = 8080
HTTP = 80
HTTP_ALT = 8080
HTTPS = 443
KIBANA = 5601
POSTGRESQL = 5432
REDIS = 6379
RELP = 20514
SSH = 22
STATSITE = 8125

AMAZON_S3_HOSTED_ZONE_ID = 'Z3AQBSTGFYJSTF'
AMAZON_S3_WEBSITE_DOMAIN = 's3-website-us-east-1.amazonaws.com'
