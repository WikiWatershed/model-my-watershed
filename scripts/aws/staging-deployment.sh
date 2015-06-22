#!/bin/bash

set -e

if env | grep -q "MMW_DEPLOY_DEBUG"; then
  set -x
fi

CURRENT_STACK_COLOR=$(aws cloudformation describe-stacks \
  --profile "${MMW_AWS_PROFILE}" \
  --output text \
  | egrep "TAGS\s+StackColor" \
  | egrep "Blue|Green" \
  | cut -f3 \
  | uniq \
  | tr "[:upper:]" "[:lower:]")

STACK_COLOR_COUNT=$(echo "${CURRENT_STACK_COLOR}" \
  | wc -l \
  | xargs)

# Determine which color stack to launch
if [ "${STACK_COLOR_COUNT}" -gt 1 ]; then
  echo "Both stack colors already exist."
  exit 1
elif [ "${CURRENT_STACK_COLOR}" = "blue" ]; then
  NEW_STACK_COLOR="green"
elif [ "${CURRENT_STACK_COLOR}" = "green" ]; then
  NEW_STACK_COLOR="blue"
fi

pushd deployment

# Attempt to launch a new stack & cutover DNS
python mmw_stack.py launch-stacks \
  --aws-profile "${MMW_AWS_PROFILE}" \
  --mmw-profile "${MMW_PROFILE}" \
  --mmw-config-path "${MMW_CONFIG_PATH}" \
  --stack-color "${NEW_STACK_COLOR}" \
  --activate-dns

# Remove old stack
python mmw_stack.py remove-stacks \
  --aws-profile "${MMW_AWS_PROFILE}" \
  --mmw-profile "${MMW_PROFILE}" \
  --mmw-config-path "${MMW_CONFIG_PATH}" \
  --stack-color "${CURRENT_STACK_COLOR}" \
