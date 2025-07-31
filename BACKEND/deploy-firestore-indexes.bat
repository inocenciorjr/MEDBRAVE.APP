@echo off
echo.
echo ========================================
echo  DEPLOY DOS INDICES COMPOSTOS FIRESTORE
echo ========================================
echo.

echo [1/3] Verificando Firebase CLI...
firebase --version
if %errorlevel% neq 0 (
    echo ERRO: Firebase CLI nao encontrado!
    echo Instale com: npm install -g firebase-tools
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando arquivo de indices...
if not exist "firestore-indexes.json" (
    echo ERRO: Arquivo firestore-indexes.json nao encontrado!
    echo Execute este script na pasta raiz do projeto.
    pause
    exit /b 1
)

echo Arquivo encontrado: firestore-indexes.json
echo.

echo [3/3] Fazendo deploy dos indices...
echo.
echo ATENCAO: Este comando ira criar os indices compostos no Firestore.
echo O processo pode levar alguns minutos para ser concluido.
echo.
set /p confirm="Deseja continuar? (s/n): "
if /i "%confirm%" neq "s" (
    echo Deploy cancelado pelo usuario.
    pause
    exit /b 0
)

echo.
echo Iniciando deploy...
firebase deploy --only firestore:indexes

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  DEPLOY CONCLUIDO COM SUCESSO!
    echo ========================================
    echo.
    echo Os indices compostos foram criados no Firestore.
    echo.
    echo IMPORTANTE:
    echo - Os indices podem levar alguns minutos para ficarem prontos
    echo - Monitore o status no Firebase Console
    echo - As queries falharao ate os indices estarem ativos
    echo.
) else (
    echo.
    echo ========================================
    echo  ERRO NO DEPLOY!
    echo ========================================
    echo.
    echo Verifique:
    echo - Se voce esta logado no Firebase: firebase login
    echo - Se o projeto esta configurado: firebase use --add
    echo - Se tem permissoes no projeto
    echo.
)

echo.
pause 