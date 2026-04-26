// =============================================================================
// Jenkinsfile — Inventory App DevSecOps CI Pipeline
//
// Stages:
//   1. Checkout
//   2. Install Dependencies
//   3. Run Tests (with coverage)
//   4. SonarQube SAST
//   5. Quality Gate
//   6. Docker Build
//   7. Trivy Image Scan
//   8. Push to DockerHub
//   9. Update GitOps Manifest
//
// Post: Slack notification on success/failure
// =============================================================================

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        skipStagesAfterUnstable()
    }

    environment {
        // ── App & Image ──────────────────────────────────────────────────
        APP_NAME    = 'inventory-app'
        DOCKER_REPO = 'aboelaiz/inventory-app'

        // IMAGE_TAG is set dynamically in Checkout stage:
        //   <BUILD_NUMBER>-<git-short-sha>  e.g. 42-a1b2c3d
        IMAGE_TAG   = ''

        // ── SonarQube ────────────────────────────────────────────────────
        SONAR_PROJECT_KEY  = 'inventory-app'
        SONAR_PROJECT_NAME = 'Inventory App'

        // ── GitOps ───────────────────────────────────────────────────────
        // Kustomization file that Jenkins patches with the new tag
        KUSTOMIZE_FILE = 'k8s/kustomization.yaml'
    }

    stages {

        // ── Stage 1: Checkout ────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm

                script {
                    def shortSha = sh(returnStdout: true,
                                      script: 'git rev-parse --short HEAD').trim()
                    env.IMAGE_TAG   = "${env.BUILD_NUMBER}-${shortSha}"
                    env.GIT_BRANCH  = sh(returnStdout: true,
                                         script: 'git rev-parse --abbrev-ref HEAD').trim()
                    env.COMMIT_MSG  = sh(returnStdout: true,
                                         script: 'git log -1 --pretty=%s').trim()

                    echo "📦  Image tag  : ${env.IMAGE_TAG}"
                    echo "🌿  Branch     : ${env.GIT_BRANCH}"
                    echo "💬  Commit     : ${env.COMMIT_MSG}"
                }
            }
        }

        // ── Stage 2: Install Dependencies ───────────────────────────────
        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "📥  Installing Node.js dependencies..."
                    npm ci --ignore-scripts
                    echo "✅  Dependencies installed."
                '''
            }
        }

        // ── Stage 3: Run Tests ───────────────────────────────────────────
        stage('Run Tests') {
            steps {
                sh '''
                    echo "🧪  Running unit tests with coverage..."
                    npm run test:cov -- \
                        --forceExit \
                        --passWithNoTests \
                        --coverageReporters=lcov,text,clover
                '''
            }
            post {
                always {
                    // Publish JUnit results if jest-junit reporter is configured
                    junit allowEmptyResults: true, testResults: 'coverage/junit.xml'
                    // Publish HTML coverage report
                    publishHTML([
                        allowMissing:           true,
                        alwaysLinkToLastBuild:  true,
                        keepAll:                true,
                        reportDir:              'coverage/lcov-report',
                        reportFiles:            'index.html',
                        reportName:             'Coverage Report'
                    ])
                }
            }
        }

        // ── Stage 4: SonarQube SAST ──────────────────────────────────────
        stage('SonarQube SAST') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    withCredentials([string(credentialsId: 'sonar-token',
                                           variable: 'SONAR_AUTH_TOKEN')]) {
                        sh '''
                            echo "🔍  Running SonarQube static analysis..."
                            sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.projectName="${SONAR_PROJECT_NAME}" \
                              -Dsonar.login=${SONAR_AUTH_TOKEN} \
                              -Dsonar.branch.name=${GIT_BRANCH}
                        '''
                    }
                }
            }
        }

        // ── Stage 5: Quality Gate ────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "❌  SonarQube Quality Gate FAILED: ${qg.status}"
                        }
                        echo "✅  Quality Gate passed: ${qg.status}"
                    }
                }
            }
        }

        // ── Stage 6: Docker Build ────────────────────────────────────────
        stage('Docker Build') {
            steps {
                sh """
                    echo "🐳  Building Docker image: ${DOCKER_REPO}:${IMAGE_TAG}"
                    docker build \\
                      --label "build.number=${BUILD_NUMBER}" \\
                      --label "git.commit=${GIT_COMMIT}" \\
                      --label "git.branch=${GIT_BRANCH}" \\
                      --label "build.date=\$(date -u +%Y-%m-%dT%H:%M:%SZ)" \\
                      -t ${DOCKER_REPO}:${IMAGE_TAG} \\
                      .
                    echo "✅  Image built: ${DOCKER_REPO}:${IMAGE_TAG}"
                """
            }
        }

        // ── Stage 7: Trivy Image Scan ────────────────────────────────────
        stage('Trivy Scan') {
            steps {
                sh """
                    echo "🔒  Scanning image with Trivy..."
                    trivy image \\
                      --exit-code 0 \\
                      --severity HIGH,CRITICAL \\
                      --no-progress \\
                      --format table \\
                      --output trivy-report.txt \\
                      ${DOCKER_REPO}:${IMAGE_TAG}

                    echo "--- Trivy Summary ---"
                    cat trivy-report.txt

                    # Fail the pipeline on CRITICAL vulnerabilities
                    trivy image \\
                      --exit-code 1 \\
                      --severity CRITICAL \\
                      --no-progress \\
                      --quiet \\
                      ${DOCKER_REPO}:${IMAGE_TAG}

                    echo "✅  No CRITICAL vulnerabilities found."
                """
            }
            post {
                always {
                    // Archive Trivy report as build artifact
                    archiveArtifacts artifacts: 'trivy-report.txt',
                                     allowEmptyArchive: true
                }
            }
        }

        // ── Stage 8: Push to DockerHub ───────────────────────────────────
        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "📤  Pushing ${DOCKER_REPO}:${IMAGE_TAG} to DockerHub..."
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin

                        docker push ${DOCKER_REPO}:${IMAGE_TAG}

                        docker logout
                        echo "✅  Image pushed successfully."
                    """
                }
            }
        }

        // ── Stage 9: Update GitOps Manifest ──────────────────────────────
        stage('Update GitOps Manifest') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )
                ]) {
                    sh """
                        echo "📝  Updating GitOps manifest with image tag: \${IMAGE_TAG}"

                        # Update the newTag field in kustomization.yaml
                        sed -i "s|newTag:.*|newTag: \\"\${IMAGE_TAG}\\"|g" \${KUSTOMIZE_FILE}

                        echo "--- Updated kustomization.yaml ---"
                        grep -A2 'images:' \${KUSTOMIZE_FILE} || cat \${KUSTOMIZE_FILE}

                        # Commit and push (skip if nothing changed)
                        git config user.email "jenkins@ci.local"
                        git config user.name "Jenkins CI"
                        
                        # Use the authenticated URL for pushing
                        git remote set-url origin https://\${GIT_USER}:\${GIT_TOKEN}@github.com/YOUR_ORG/inventory_app.git

                        git add \${KUSTOMIZE_FILE}

                        if git diff --staged --quiet; then
                            echo "ℹ️   No changes to commit — image tag already up to date."
                        else
                            git commit -m "ci(deploy): update inventory-app to \${IMAGE_TAG}

Build: #\${BUILD_NUMBER}
Branch: \${GIT_BRANCH}
Commit: \${GIT_COMMIT}
[skip ci]"
                            git push origin HEAD:\${GIT_BRANCH}
                            echo "✅  GitOps manifest updated and pushed."
                        fi
                    """
                }
            }
        }
    }

    // ── Post: Slack Notifications ─────────────────────────────────────────
    post {
        success {
            withCredentials([string(credentialsId: 'slack-webhook-url',
                                   variable: 'SLACK_URL')]) {
                sh """
                    curl -s -X POST "\${SLACK_URL}" \\
                      -H 'Content-Type: application/json' \\
                      -d '{
                        "attachments": [{
                          "color": "#36a64f",
                          "title": "✅ Pipeline SUCCEEDED — ${APP_NAME}",
                          "fields": [
                            {"title": "Branch",  "value": "${GIT_BRANCH}",  "short": true},
                            {"title": "Build",   "value": "#${BUILD_NUMBER}", "short": true},
                            {"title": "Image",   "value": "${DOCKER_REPO}:${IMAGE_TAG}", "short": false},
                            {"title": "Commit",  "value": "${COMMIT_MSG}", "short": false}
                          ],
                          "footer": "Jenkins CI",
                          "ts": '"\$(date +%s)"'
                        }]
                      }'
                """
            }
        }

        failure {
            withCredentials([string(credentialsId: 'slack-webhook-url',
                                   variable: 'SLACK_URL')]) {
                sh """
                    curl -s -X POST "\${SLACK_URL}" \\
                      -H 'Content-Type: application/json' \\
                      -d '{
                        "attachments": [{
                          "color": "#cc0000",
                          "title": "❌ Pipeline FAILED — ${APP_NAME}",
                          "fields": [
                            {"title": "Branch",  "value": "${GIT_BRANCH}",  "short": true},
                            {"title": "Build",   "value": "#${BUILD_NUMBER}", "short": true},
                            {"title": "Stage",   "value": "${env.STAGE_NAME ?: 'Unknown'}", "short": true},
                            {"title": "Logs",    "value": "${BUILD_URL}console", "short": false}
                          ],
                          "footer": "Jenkins CI",
                          "ts": '"\$(date +%s)"'
                        }]
                      }'
                """
            }
        }

        always {
            // Clean workspace to avoid disk pressure on Jenkins container
            cleanWs()
        }
    }
}
