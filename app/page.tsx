import { searchIzakaya } from "./actions/izakayaSearch";

export default function Home() {
  return (
    <>
      <h1 className="flex justify-center mt-10 text-xl">
        居酒屋アプリのフォーム
      </h1>
      <div className="mx-auto mt-10 w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <form action={searchIzakaya}>
          {/* TODO　ここで現在地から取得するのか、駅名で検索するのかラジオボタンで選択できるようにする
          <div>
            <input
              type="radio"
              name="central"
              id="current location"
              placeholder="現在地から探す"
              className="hidden peer"
            ></input>
            <label
              htmlFor="current location"
              className="flex flex-col w-full max-w-lg mx-auto text-center border-2 rounded-2xl border-gray-900 p-2 my-4 text-3xl hover:bg-yellow-200 peer-checked:bg-green-200"
            >
              現在地から探す
            </label>
            <input
              type="radio"
              name="central"
              id="station"
              placeholder="駅名"
              className="hidden peer"
            ></input>
            <label
              htmlFor="station"
              className="flex flex-col w-full max-w-lg mx-auto text-center border-2 rounded-2xl border-gray-900 p-2 my-4 text-3xl hover:bg-yellow-200 peer-checked:bg-green-200"
            >
              駅名で探す
            </label>
          </div> */}
          <div>
            <label htmlFor="station">
              探したい最寄り駅（駅名を記載してください）
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="station"
              type="text"
              name="station"
              placeholder="最寄り駅"
              required
            />
          </div>
          <div className="mt-5">
            <label htmlFor="people">参加人数</label>
            <input
              type="number"
              id="people"
              name="people"
              className="ml-3"
              placeholder="1"
              required
            />
            人
          </div>
          <div className="mt-5">
            <label htmlFor="budget">予算</label>
            <select
              id="budget"
              name="budget"
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="unspecified">指定なし</option>
              <option value="up_to_3000">3000円以内</option>
              <option value="up_to_5000">5000円以内</option>
              <option value="up_to_8000">8000円以内</option>
            </select>
          </div>
          <div className="mt-5">
            <label htmlFor="isDrink">飲み放題の有無</label>
            <select
              name="isDrink"
              id="isDrink"
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="true">有り</option>
              <option value="false">なし</option>
            </select>
          </div>
          <div className="mt-5">
            <label htmlFor="isBeer">ビールの有無</label>
            <select
              name="isBeer"
              id="isBeer"
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:rng-opacity-50"
            >
              <option value="true">有り</option>
              <option value="false">なし</option>
            </select>
          </div>
          <div className="mt-5">
            <label htmlFor="mood">ムードの選択</label>
            <select
              name="mood"
              id="mood"
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:rng-opacity-50"
            >
              <option value="waiwai">ワイワイ！！</option>
              <option value="calm">静かめ</option>
              <option value="date">デート</option>
              <option value="colleagues">同僚、友達</option>
              <option value="with_boss">上司</option>
              <option value="solo">1人飲み</option>
            </select>
          </div>
          <div className="mt-5">
            <label htmlFor="preferences" className="flex justyfy-start">
              自由記述
            </label>
            <textarea
              name="preferences"
              id="preferences"
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:rng-opacity-50"
            ></textarea>
          </div>
          <div className="mt-5">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              検索する
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
