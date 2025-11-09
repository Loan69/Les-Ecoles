import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Option } from "@/types/Option";

interface SelectField2Props {
    name: string;
    value: string;
    options: Option[];
    onChange: (selected: Option | null) => void;
    placeholder?: string;
    disabled?: boolean;
    selectClassName?: string;
}

export default function SelectField2({
    name,
    value,
    options,
    onChange,
    placeholder = "Sélectionner une option",
    disabled,
    selectClassName = "",
    }: SelectField2Props) {
    // Vérifier que options existe et est un tableau
    const safeOptions = Array.isArray(options) ? options : [];
    
    const selectedOption = safeOptions.find(
        (opt) => String(opt.id) === String(value)
    );


    return (
        <Select
        value={String(value || "")}
        onValueChange={(selectedId) => {
            const selected = options.find(
            (opt) => String(opt.id) === String(selectedId)
            );
            onChange(selected || null);
        }}
        disabled={disabled}
        >
        <SelectTrigger 
            className={`
            ${selectClassName} 
            bg-white 
            border-2 
            border-blue-200 
            hover:border-blue-400 
            focus:border-blue-500 
            focus:ring-2 
            focus:ring-blue-200 
            transition-all 
            duration-200
            shadow-sm
            hover:shadow-md
            font-medium
            text-gray-800
            max-w-[160px] // largeur max sur mobile
            md:max-w-none // pas de limite sur desktop
            ${disabled ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-60" : ""}
            `}
        >
            <SelectValue placeholder={placeholder}>
            {selectedOption ? (
                <span className="flex items-center gap-2 truncate">
                    {selectedOption.value === "non" && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                    )}
                    {selectedOption.value === "oui" && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                    )}
                    <span className="truncate">{selectedOption.label ?? selectedOption.value}</span>
                </span>
            ) : (
                <span className="text-gray-400">{placeholder}</span>
            )}
            </SelectValue>
        </SelectTrigger>
        <SelectContent 
            className="
            bg-white 
            border-2 
            border-blue-200 
            shadow-xl 
            rounded-lg
            max-h-[300px]
            overflow-y-auto
            "
        >
            {options.map((opt) => (
            <SelectItem 
                key={String(opt.id)} 
                value={String(opt.id)}
                className="
                cursor-pointer
                hover:bg-blue-50
                focus:bg-blue-100
                transition-colors
                py-3
                px-4
                font-medium
                text-gray-700
                data-[state=checked]:bg-blue-500
                data-[state=checked]:text-white
                "
            >
                <span className="flex items-center gap-2">
                {opt.value === "non" && (
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                )}
                {opt.value === "oui" && (
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                )}
                {opt.label ?? opt.value}
                </span>
            </SelectItem>
            ))}
        </SelectContent>
        </Select>
    );
}