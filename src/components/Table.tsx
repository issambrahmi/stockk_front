import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const invoices = [
    {
        invoice: "INV001",
        paymentStatus: "Paid",
        totalAmount: 250,
        paymentMethod: "Credit Card",
    },
    {
        invoice: "INV002",
        paymentStatus: "Pending",
        totalAmount: 150,
        paymentMethod: "PayPal",
    },
    {
        invoice: "INV003",
        paymentStatus: "Unpaid",
        totalAmount: 350,
        paymentMethod: "Bank Transfer",
    },
    {
        invoice: "INV004",
        paymentStatus: "Paid",
        totalAmount: 450,
        paymentMethod: "Credit Card",
    },

];



export function TableDemo() {
    const [data, setData] = useState(invoices);

    const updateField = (
        invoiceId: string,
        field: "paymentStatus" | "paymentMethod" | "totalAmount",
        value: string
    ) => {
        setData(prev =>
            prev.map(item =>
                item.invoice === invoiceId
                    ? { ...item, [field]: value }
                    : item
            )
        )
    }
    return (
        <Table className="">
            <TableCaption>A list of your recent invoices.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((invoice) => (
                    <TableRow key={invoice.invoice}>
                        <TableCell className="font-medium">{invoice.invoice}</TableCell>
                        <TableCell>
                            <Input
                                value={invoice.paymentStatus}
                                onChange={(e) =>
                                    updateField(invoice.invoice, "paymentStatus", e.target.value)
                                }
                                className="border-none bg-transparent focus-visible:ring-0"
                            />
                        </TableCell>
                        <TableCell>{invoice.paymentMethod}</TableCell>
                        <TableCell>
                            <Input
                                value={invoice.totalAmount}
                                onChange={(e) => {
                                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                                        updateField(invoice.invoice, "totalAmount", e.target.value)
                                    }
                                }
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                className="border-none bg-transparent text-right focus:bg-yellow-50 focus:border-yellow-400focus:ring-0transition-all duration-150"
                            /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">2500</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    )
}
