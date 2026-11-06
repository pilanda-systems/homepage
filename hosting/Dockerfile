# Serves site/ as it stands. There is nothing to compile here, so one stage is
# enough: site/ is built by scripts/build-site.mjs and committed.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24
COPY hosting/nginx.conf /etc/nginx/conf.d/default.conf
COPY site /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
