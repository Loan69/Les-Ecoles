'use client'

export default function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#1b0a6d] border-opacity-50"></div>
        <span className="pl-3 text-[#1b0a6d]">Chargement ...</span>
        </div>
    );
}