'use client';

import { useState } from 'react';

export default function ClearDataPage() {
    const [status, setStatus] = useState<string[]>([]);
    const [done, setDone] = useState(false);

    const clearAllData = async () => {
        const logs: string[] = [];

        try {
            // 1. Limpar localStorage
            const localStorageKeys = Object.keys(localStorage);
            localStorage.clear();
            logs.push(`✅ localStorage limpo (${localStorageKeys.length} itens)`);
        } catch (e) {
            logs.push(`❌ Erro ao limpar localStorage: ${e}`);
        }

        try {
            // 2. Limpar sessionStorage
            const sessionStorageKeys = Object.keys(sessionStorage);
            sessionStorage.clear();
            logs.push(`✅ sessionStorage limpo (${sessionStorageKeys.length} itens)`);
        } catch (e) {
            logs.push(`❌ Erro ao limpar sessionStorage: ${e}`);
        }

        try {
            // 3. Limpar cookies
            const cookies = document.cookie.split(';');
            cookies.forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.medbrave.com.br`;
            });
            logs.push(`✅ Cookies limpos (${cookies.length} itens)`);
        } catch (e) {
            logs.push(`❌ Erro ao limpar cookies: ${e}`);
        }

        try {
            // 4. Limpar IndexedDB
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                }
            }
            logs.push(`✅ IndexedDB limpo (${databases.length} databases)`);
        } catch (e) {
            logs.push(`❌ Erro ao limpar IndexedDB: ${e}`);
        }

        try {
            // 5. Limpar Cache API
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
                await caches.delete(name);
            }
            logs.push(`✅ Cache API limpo (${cacheNames.length} caches)`);
        } catch (e) {
            logs.push(`❌ Erro ao limpar Cache API: ${e}`);
        }

        try {
            // 6. Desregistrar Service Workers
            const registrations = await navigator.serviceWorker?.getRegistrations() || [];
            for (const registration of registrations) {
                await registration.unregister();
            }
            logs.push(`✅ Service Workers removidos (${registrations.length})`);
        } catch (e) {
            logs.push(`❌ Erro ao remover Service Workers: ${e}`);
        }

        setStatus(logs);
        setDone(true);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-2xl font-bold mb-4">Limpar Dados do Site</h1>

            {!done ? (
                <div>
                    <p className="mb-4 text-gray-300">
                        Esta página vai limpar todos os dados salvos do MedBrave no seu navegador:
                    </p>
                    <ul className="list-disc list-inside mb-6 text-gray-400">
                        <li>localStorage</li>
                        <li>sessionStorage</li>
                        <li>Cookies</li>
                        <li>IndexedDB</li>
                        <li>Cache</li>
                        <li>Service Workers</li>
                    </ul>
                    <button
                        onClick={clearAllData}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium"
                    >
                        Limpar Todos os Dados
                    </button>
                </div>
            ) : (
                <div>
                    <div className="bg-gray-800 rounded-lg p-4 mb-6">
                        {status.map((log, i) => (
                            <p key={i} className="font-mono text-sm mb-1">{log}</p>
                        ))}
                    </div>
                    <p className="text-green-400 mb-4">✅ Limpeza concluída!</p>
                    <a
                        href="/login"
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium inline-block"
                    >
                        Ir para Login
                    </a>
                </div>
            )}
        </div>
    );
}
