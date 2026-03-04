FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Horand.API/Horand.API.csproj", "src/Horand.API/"]
COPY ["src/Horand.Application/Horand.Application.csproj", "src/Horand.Application/"]
COPY ["src/Horand.Domain/Horand.Domain.csproj", "src/Horand.Domain/"]
COPY ["src/Horand.Infrastructure/Horand.Infrastructure.csproj", "src/Horand.Infrastructure/"]
RUN dotnet restore "src/Horand.API/Horand.API.csproj"
COPY . .
WORKDIR "/src/src/Horand.API"
RUN dotnet build "Horand.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Horand.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libfontconfig1 \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=publish /app/publish .
RUN mkdir -p /app/uploads
ENTRYPOINT ["dotnet", "Horand.API.dll"]
