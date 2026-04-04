#!/bin/sh
set -ex

apt-get update

apt-get install -y \
  patch \
  poppler-utils \
  ghostscript

rm -rf /var/lib/apt/lists/*

if [ -f /etc/ImageMagick-6/policy.xml ]; then
patch /etc/ImageMagick-6/policy.xml <<EOF
--- old.xml	2022-03-23 09:16:03.985433900 -0400
+++ new.xml	2022-03-23 09:16:18.625471992 -0400
@@ -91,6 +91,5 @@
   <policy domain="coder" rights="none" pattern="PS2" />
   <policy domain="coder" rights="none" pattern="PS3" />
   <policy domain="coder" rights="none" pattern="EPS" />
-  <policy domain="coder" rights="none" pattern="PDF" />
   <policy domain="coder" rights="none" pattern="XPS" />
 </policymap>
EOF
fi
