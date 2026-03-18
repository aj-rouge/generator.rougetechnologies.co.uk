export default function NoteInput({ note, setNote }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 flex flex-col lg:flex-row gap-4 w-full rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="w-full">
        <label className="block text-black dark:text-gray-100 mb-2 font-medium">
          Important Notes / Issues:
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                   rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                   dark:bg-gray-700 dark:text-gray-100"
          placeholder="Describe any issues, missing accessories, cosmetic damage, or warranty information..."
          rows={5}
        />
      </div>

      <div className="mt-2 w-full lg:w-fit p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-gray-700 dark:text-gray-300">
        <p className="font-medium mb-1 dark:text-gray-100">
          📌 Note Guidelines:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Mention any cosmetic issues (scratches, dents, wear)</li>
          <li>List missing accessories (charger, cables, manuals)</li>
          <li>Note any functional issues or limitations</li>
          <li>If no issues, you can leave this empty</li>
        </ul>
      </div>
    </div>
  );
}
