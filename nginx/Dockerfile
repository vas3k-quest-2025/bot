FROM nginx:alpine

# Копируем конфигурацию
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY header.html /etc/nginx/html/header.html
COPY footer.html /etc/nginx/html/footer.html

# Создаем директорию для файлов
RUN mkdir -p /app/user_files

# Запускаем nginx с подстановкой переменных
CMD ["/bin/sh", "-c", "envsubst '$$SECRET_PATH' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"] 