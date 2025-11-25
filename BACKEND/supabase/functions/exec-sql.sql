-- Função para executar comandos SQL via RPC
-- Esta função permite que o script TypeScript execute comandos SQL

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Conceder permissões para o service role
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;