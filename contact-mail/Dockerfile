FROM mcr.microsoft.com/dotnet/sdk:10.0.403-alpine3.24 AS build
WORKDIR /src
COPY ContactMail.csproj .
RUN dotnet restore
COPY Program.cs .
RUN dotnet publish --no-restore -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0.14-alpine3.24
WORKDIR /app
COPY --from=build /app .
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["dotnet", "ContactMail.dll"]
