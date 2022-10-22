// https://raw.githubusercontent.com/icon-project/java-score-examples/master/build.gradle

const mainBuildGradle = `buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath 'foundation.icon:gradle-javaee-plugin:0.8.1'
    }
}

subprojects {
    repositories {
        mavenCentral()
    }

    apply plugin: 'java'
    apply plugin: 'foundation.icon.javaee'

    java {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    // need to add this option to retrieve formal parameter names
    compileJava {
        options.compilerArgs += ['-parameters']
    }
}`;

const gradleSettings = `rootProject.name = 'java-score-examples'
include ()`;

const gitignore = `
keystore.json
# Created by https://www.toptal.com/developers/gitignore/api/gradle,java,macos
# Edit at https://www.toptal.com/developers/gitignore?templates=gradle,java,macos

### Java ###
# Compiled class file
*.class

# Log file
*.log

# BlueJ files
*.ctxt

# Mobile Tools for Java (J2ME)
.mtj.tmp/

# Package Files #
*.jar
*.war
*.nar
*.ear
*.zip
*.tar.gz
*.rar

# virtual machine crash logs, see http://www.java.com/en/download/help/error_hotspot.xml
hs_err_pid*
replay_pid*

### macOS ###
# General
.DS_Store
.AppleDouble
.LSOverride

# Icon must end with two \r
Icon


# Thumbnails
._*

# Files that might appear in the root of a volume
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent

# Directories potentially created on remote AFP share
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.apdisk

### macOS Patch ###
# iCloud generated files
*.icloud

### Gradle ###
.cache
.gradle
**/build/
!src/**/build/

# Ignore Gradle GUI config
gradle-app.setting

# Avoid ignoring Gradle wrapper jar file (.jar files are usually ignored)
!gradle-wrapper.jar

# Avoid ignore Gradle wrappper properties
!gradle-wrapper.properties

# Cache of project
.gradletasknamecache

# Eclipse Gradle plugin generated files
# Eclipse Core
.project
# JDT-specific (Eclipse Java Development Tools)
.classpath

### Gradle Patch ###
# Java heap dump
*.hprof

# End of https://www.toptal.com/developers/gitignore/api/gradle,java,macos
`;
export {gradleSettings, mainBuildGradle, gitignore};
