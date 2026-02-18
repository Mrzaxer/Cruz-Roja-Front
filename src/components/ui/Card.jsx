export default function Card({ children, className = '', title, icon }) {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
            {icon && <span>{icon}</span>}
            <span>{title}</span>
          </h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}