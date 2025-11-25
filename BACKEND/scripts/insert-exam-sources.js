/**
 * Script to insert exam sources from provas-list.json into Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertExamSources() {
  try {
    console.log('📋 Reading provas-list.json...');
    
    const filePath = path.join(__dirname, '../output/hardworq/provas-list.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const provas = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${provas.length} provas from file`);
    
    // Transform data for database
    const examSources = provas.map(prova => ({
      source_index: prova.index,
      label: prova.label,
      source_value: prova.value
    }));
    
    console.log('💾 Inserting into database in batches...');
    
    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < examSources.length; i += batchSize) {
      const batch = examSources.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('exam_sources')
        .upsert(batch, { 
          onConflict: 'source_index',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`✅ Inserted batch ${i / batchSize + 1} (${inserted}/${examSources.length})`);
      }
    }
    
    console.log('');
    console.log('=== Summary ===');
    console.log(`Total records: ${examSources.length}`);
    console.log(`Successfully inserted: ${inserted}`);
    console.log(`Errors: ${errors}`);
    console.log('');
    
    if (errors === 0) {
      console.log('✅ All exam sources inserted successfully!');
    } else {
      console.log('⚠️ Some records failed to insert');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

insertExamSources();
