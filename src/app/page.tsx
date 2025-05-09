import TokenCard from "./TokenCard"; // Import with explicit file extension

export default async function Home() {
  return (
    <div className='flex flex-col'>
      <div className='flex flex-col gap-2 p-2'>
        {/* Empty container */}
      </div>
      
      {/* Include the token generation functionality as a client component */}
      <div className="mt-6">
        <TokenCard />
      </div>
    </div>
  );
}