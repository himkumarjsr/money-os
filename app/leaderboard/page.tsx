export default function LeaderboardPage() {
  const rows = [
    ["1", "Priya S.", "Bengaluru", "450 FK", "💪"],
    ["2", "Rahul M.", "Mumbai", "380 FK", "🛡️"],
    ["3", "Ankit K.", "Delhi", "310 FK", "📊"],
    ["4", "Sneha R.", "Pune", "290 FK", "🌱"],
    ["5", "Vikram P.", "Hyderabad", "245 FK", "💰"],
    ["6", "Divya T.", "Chennai", "220 FK", "🎯"],
    ["7", "Arjun N.", "Jaipur", "195 FK", "📚"],
    ["8", "Pooja S.", "Lucknow", "170 FK", "🔥"],
    ["9", "Karan B.", "Surat", "145 FK", "💪"],
    ["10", "Meera G.", "Nagpur", "120 FK", "🌱"],
  ];

  return (
    <div className="min-h-dvh bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">Finkoin Leaderboard</h1>
        <p className="mt-2 text-slate-600">Weekly</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Weekly FK</th>
                <th className="px-4 py-3">Top Badge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]} className="border-t border-slate-100">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="mt-8 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold">Referral rewards</h2>
          <p className="mt-2 text-sm text-slate-700">Earn 200 FK when a friend joins</p>
          <p className="text-sm text-slate-700">Earn 500 FK when a friend subscribes</p>
          <p className="mt-2 text-sm text-slate-600">Your referral link: finkoin.com?ref=user</p>
          <button type="button" className="mt-3 rounded-lg bg-[#534AB7] px-3 py-2 text-sm font-semibold text-white">
            Copy link
          </button>
        </section>
      </div>
    </div>
  );
}

