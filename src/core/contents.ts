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

export {gradleSettings, mainBuildGradle};
