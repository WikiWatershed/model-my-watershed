#!/bin/bash

DISK="/dev/sda"
PARTITION="${DISK}3"
VG_NAME="ubuntu-vg"
LV_PATH="/dev/ubuntu-vg/ubuntu-lv"

echo "Starting LVM disk resize process..."

# Fix GPT table if necessary
if sudo gdisk $DISK <<<"p" | grep -q "GPT PMBR size mismatch"; then
  echo "Fixing GPT table..."
  echo -e "w\ny\n" | sudo gdisk $DISK
fi

# Find the start sector of the LVM partition (sda3)
START_SECTOR=$(sudo fdisk -l $DISK | grep "$PARTITION" | awk '{print $2}')

# Recreate partition 3 to take full space, but starting at the same sector
echo "Resizing partition..."
sudo sgdisk -d 3 $DISK
sudo sgdisk -n 3:$START_SECTOR:0 $DISK

# Inform the kernel of the partition changes
sudo partprobe $DISK

# Resize the physical volume
echo "Resizing physical volume..."
sudo pvresize $PARTITION

# Extend the logical volume
echo "Extending logical volume..."
sudo lvextend -l +100%FREE $LV_PATH

# Resize the filesystem
echo "Resizing filesystem..."
sudo resize2fs $LV_PATH

echo "LVM resize complete."
