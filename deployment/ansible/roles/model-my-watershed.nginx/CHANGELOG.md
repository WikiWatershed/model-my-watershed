## 1.0.0

 - Update ansible syntax to support 2.5+.

## 0.3.1

- Add correct JavaScript MIME type to `gzip_types`.

## 0.3.0

- In addition to all of the Nginx modules supported before, add support for the following third-party modules:

  - Auth PAM
  - DAV Ext
  - Echo
  - HTTP Substitution Filter
  - Upstream Fair Queue

## 0.2.2

- Disable `server_tokens` setting.

## 0.2.1

- Fix log rotation bug because of Nginx Upstart script (see also: https://bugs.launchpad.net/nginx/+bug/1450770)

## 0.2.0

- Change `nginx_version` scheme to use `stable` and `development`.

## 0.1.1

- Bump version of Nginx to `1.6.2-2+trusty0`.

## 0.1.0

- Initial release.
