# Build arguments (must be before FROM)
ARG TARGETARCH=amd64

# Import computer-use plugin based on architecture
FROM computer-use-${TARGETARCH}:build AS computer-use-plugin
FROM ubuntu:22.04

# Declare build argument for mirror source selection
ARG MIRROR_SOURCE=aliyun

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Configure mirror sources dynamically based on MIRROR_SOURCE
# Use a script approach for better reliability
RUN cp /etc/apt/sources.list /etc/apt/sources.list.backup

# Configure Alibaba Cloud mirror source
RUN if [ "$MIRROR_SOURCE" = "aliyun" ]; then \
        echo "# Alibaba Cloud Mirror (Primary choice - more stable)" > /etc/apt/sources.list && \
        echo "deb http://mirrors.aliyun.com/ubuntu/ jammy main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.aliyun.com/ubuntu/ jammy main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.aliyun.com/ubuntu/ jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.aliyun.com/ubuntu/ jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.aliyun.com/ubuntu/ jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.aliyun.com/ubuntu/ jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.aliyun.com/ubuntu/ jammy-security main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.aliyun.com/ubuntu/ jammy-security main restricted universe multiverse" >> /etc/apt/sources.list; \
    fi

# Configure USTC mirror source  
RUN if [ "$MIRROR_SOURCE" = "ustc" ]; then \
        echo "# USTC Mirror (University of Science and Technology of China)" > /etc/apt/sources.list && \
        echo "deb http://mirrors.ustc.edu.cn/ubuntu/ jammy main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.ustc.edu.cn/ubuntu/ jammy main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.ustc.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.ustc.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.ustc.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.ustc.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.ustc.edu.cn/ubuntu/ jammy-security main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.ustc.edu.cn/ubuntu/ jammy-security main restricted universe multiverse" >> /etc/apt/sources.list; \
    fi

# Configure Tsinghua University mirror source
RUN if [ "$MIRROR_SOURCE" = "tuna" ]; then \
        echo "# Tsinghua University Mirror (TUNA)" > /etc/apt/sources.list && \
        echo "deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse" >> /etc/apt/sources.list && \
        echo "deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse" >> /etc/apt/sources.list; \
    fi

# Update package list and install VNC and desktop environment packages
RUN apt-get update && apt-get install -y \
    # Basic tools
    wget \
    git \
    vim \
    curl \
    # Desktop environment
    xfce4 \
    xfce4-terminal \
    dbus-x11 \
    # Font support
    xfonts-base \
    xfonts-100dpi \
    xfonts-75dpi \
    xfonts-scalable \
    # VNC components
    x11vnc \
    novnc \
    supervisor \
    # System tools
    net-tools \
    locales \
    # X11 components
    xvfb \
    x11-utils \
    x11-xserver-utils \
    # Screenshot tools
    gnome-screenshot \
    scrot \
    imagemagick \
    # Automation tools
    xdotool \
    xautomation \
    wmctrl \
    # Development dependencies for computer-use plugin
    build-essential \
    libx11-dev \
    libxext-dev \
    libxtst-dev \
    libxinerama-dev \
    libx11-xcb-dev \
    libxkbcommon-dev \
    libxkbcommon-x11-dev \
    libxcb-xkb-dev \
    libpng-dev \
    # Browser for testing
    chromium-browser \
    # Additional useful tools
    htop \
    tree \
    nano \
    sudo \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Environment variables
ENV DISPLAY=:1
ENV VNC_PORT=5901
ENV NO_VNC_PORT=6080
ENV VNC_RESOLUTION=1280x720
ENV VNC_USER=daytona


# Create the Daytona user and configure sudo access
RUN useradd -m -s /bin/bash daytona && \
    echo "daytona:daytona" | chpasswd && \
    echo "daytona ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/91-daytona && \
    usermod -aG sudo daytona

# Setup VNC directories
RUN mkdir -p /home/daytona/.vnc && \
    chown -R daytona:daytona /home/daytona/.vnc

# NoVNC setup - ensure symbolic link and modify launch script
RUN ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# Create directories for computer-use plugin
RUN mkdir -p /home/daytona/.daytona/computeruse && \
    chown -R daytona:daytona /home/daytona/.daytona

# Copy the pre-built computer-use plugin binary (architecture-aware)
COPY --from=computer-use-plugin /app/computer-use /usr/local/bin/computer-use
RUN chmod +x /usr/local/bin/computer-use

# Create plugin directory and link computer-use plugin
RUN mkdir -p /usr/local/lib && \
    ln -s /usr/local/bin/computer-use /usr/local/lib/daytona-computer-use

# Copy daemon binary (built by build-daemon.sh when needed)
COPY dist/apps/daemon /usr/local/bin/daytona-daemon
RUN chmod +x /usr/local/bin/daytona-daemon

# Create a startup script
COPY startup.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

# Add all scripts including daytona scripts
ADD scripts/ /home/daytona/scripts/
RUN chmod +x /home/daytona/scripts/*.sh && \
    chmod +x /home/daytona/scripts/daytona/*.sh && \
    chown -R daytona:daytona /home/daytona/scripts/


# Configure locale
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# Copy user configuration files
COPY config/bashrc_additions /home/daytona/.bashrc_additions
RUN chown daytona:daytona /home/daytona/.bashrc_additions

# Uncomment the following lines to copy XFCE4 configurations (e.g., disable screen locking):
# COPY config/xfce4/ /home/daytona/.config/xfce4/
# RUN chown -R daytona:daytona /home/daytona/.config/

# Switch to the daytona user
USER daytona
WORKDIR /home/daytona

# Set up user environment
RUN cat ~/.bashrc_additions >> ~/.bashrc && \
    rm ~/.bashrc_additions

# Create shared directory
RUN mkdir -p /home/daytona/shared

# Expose VNC, NoVNC, and API ports
EXPOSE 5901 6080 2280 22222

# Set the entry point to our startup script
ENTRYPOINT ["/usr/local/bin/startup.sh"] 