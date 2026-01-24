# Testing the Router Agent

## Prerequisites

Before testing, you must run the database migration:

1. Navigate to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/001_lists_and_router.sql`
3. Run the migration
4. Verify with:
   ```sql
   SELECT COUNT(*) FROM lists;
   SELECT COUNT(*) FROM list_items;
   SELECT COUNT(*) FROM tasks;
   ```

## Test Scenarios

### Test 1: Create Shopping List and Add Items
**Voice Input**: "Create a shopping list with milk, eggs, and bread"

**Expected Behavior**:
- Router calls `create_list` tool
- List type: `shopping`
- Creates list named "Shopping" (or similar)
- Adds 3 items: milk, eggs, bread

**Verify**:
```sql
SELECT * FROM lists WHERE name LIKE '%Shop%';
SELECT * FROM list_items WHERE list_id = '<list-id-from-above>';
```

---

### Test 2: Add to Existing List
**Voice Input**: "Add butter to shopping"

**Expected Behavior**:
- Router identifies existing "Shopping" list
- Calls `add_to_list` tool
- Adds "butter" to existing list

**Verify**:
```sql
SELECT content FROM list_items WHERE list_id = '<shopping-list-id>' ORDER BY position;
```

---

### Test 3: Create Task with Deadline
**Voice Input**: "Remind me to call mom tomorrow"

**Expected Behavior**:
- Router calls `create_task` tool
- Content: "call mom"
- Due date: tomorrow (ISO 8601 format)
- Priority: medium (default)

**Verify**:
```sql
SELECT content, due_date, priority FROM tasks ORDER BY created_at DESC LIMIT 1;
```

---

### Test 4: Create Task Without Deadline
**Voice Input**: "Don't forget to buy dog food"

**Expected Behavior**:
- Router calls `create_task` tool
- Content: "buy dog food"
- No due date
- Status: pending

**Verify**:
```sql
SELECT content, due_date, status FROM tasks ORDER BY created_at DESC LIMIT 1;
```

---

### Test 5: Save General Note to Inbox
**Voice Input**: "Interesting idea: AI could help organize my notes better"

**Expected Behavior**:
- Router calls `save_to_inbox` tool
- Creates "Inbox" list if it doesn't exist
- Adds note as list item

**Verify**:
```sql
SELECT l.name, li.content
FROM list_items li
JOIN lists l ON l.id = li.list_id
WHERE l.type = 'inbox'
ORDER BY li.created_at DESC LIMIT 1;
```

---

### Test 6: Fuzzy List Matching
**Voice Input**: "Add bananas" (when "Shopping" list exists)

**Expected Behavior**:
- Router should infer "Shopping" list context
- Calls `add_to_list` tool
- Adds "bananas" to shopping list

**Note**: This tests the router's intelligence in matching context without explicit list name mention.

---

### Test 7: Multiple Items in One Command
**Voice Input**: "Add tomatoes, onions, and garlic to shopping"

**Expected Behavior**:
- Router calls `add_to_list` tool
- Extracts 3 separate items: tomatoes, onions, garlic
- Adds all to shopping list

**Verify**:
```sql
SELECT content FROM list_items
WHERE list_id = '<shopping-list-id>'
AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY position;
```

---

### Test 8: Create Movies List
**Voice Input**: "Create a movies to watch list with Dune, Inception, and Interstellar"

**Expected Behavior**:
- Router calls `create_list` tool
- Type: `movies`
- Name: "Movies to Watch" (or similar)
- Adds 3 movies

**Verify**:
```sql
SELECT l.name, l.type, COUNT(li.id) as item_count
FROM lists l
LEFT JOIN list_items li ON li.list_id = l.id
WHERE l.type = 'movies'
GROUP BY l.id, l.name, l.type;
```

---

## Testing via UI

1. Navigate to `/dashboard/voice-command`
2. Click "Start Recording"
3. Speak one of the test scenarios above
4. Click "Stop Recording"
5. Wait for transcription
6. Click "Save as Note" → Router will execute
7. Check database or wait for UI in Phase 2

---

## Expected API Response Format

```json
{
  "success": true,
  "action": "add_to_list",
  "result": {
    "success": true,
    "list_name": "Shopping",
    "items_added": 1,
    "items_preview": ["butter"],
    "message": "Added 1 item(s) to \"Shopping\""
  },
  "execution": {
    "text": "Added butter to your Shopping list.",
    "toolCalls": 1,
    "finishReason": "stop",
    "toolName": "add_to_list"
  }
}
```

---

## Troubleshooting

### Router doesn't call any tool
- Check OpenAI API key is set
- Review system prompt context
- Check if user has any lists created (router needs context)

### Wrong tool is called
- Router may need more training examples in system prompt
- Check transcription accuracy
- Verify list names match expected patterns

### Items not added
- Check RLS policies are correct
- Verify user_id is being passed to tools
- Check Supabase logs for errors

---

## Next Steps After Testing

Once router is working correctly:
1. Proceed to Phase 2: Build Lists UI to view/manage lists
2. Proceed to Phase 3: Build Tasks UI to view/manage tasks
3. Update dashboard to show lists and tasks overview
