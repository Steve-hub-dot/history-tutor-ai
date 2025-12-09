import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-black-900 mb-4 text-center">
            History Tutor AI
          </h1>
          <p className="text-xl text-black-700 mb-12 text-center">
            Adaptív történelem tanulás Knowledge Tracing és AI segítségével
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-indigo-600">
                Tananyagok
              </h2>
              <p className="text-black-600 mb-4">
                Olvasd el a történelem tananyagokat, amelyek a tanulási stílusodhoz igazodnak.
              </p>
              <Link
                href="/lessons"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Tananyagok megtekintése →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-green-600">
                Kvízek
              </h2>
              <p className="text-black-600 mb-4">
                Teszteld a tudásod adaptív kvízekkel, amelyek a teljesítményed alapján változnak.
              </p>
              <Link
                href="/lessons"
                className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Kvízek megoldása →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Hogyan működik?</h2>
            <ol className="list-decimal list-inside space-y-3 text-black-700">
              <li>Válassz egy történelem témát és olvasd el a személyre szabott tananyagot</li>
              <li>Oldj meg egy AI által generált kvízt a témáról</li>
              <li>A Knowledge Tracing modell követi a tudásod fejlődését</li>
              <li>Az AI a gyenge területeid alapján új magyarázatokat és kvízeket készít</li>
              <li>Ismételd, amíg nem sajátítod el a témát!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
